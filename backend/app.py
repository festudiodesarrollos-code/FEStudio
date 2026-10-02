from flask import Flask, jsonify, request
from flask_cors import CORS
from functools import wraps
import os
import re
import logging
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Configurar logging seguro
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

app = Flask(__name__)

# Configuración CORS permisiva para desarrollo local (puertos 5173, 5174 y localhost)
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Headers", "X-Requested-With"]
)

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        resp = app.make_default_options_response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        return resp

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    return response

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

if not url or not key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be defined in environment")

# Cliente Supabase administrativo (Service Role) - Tiene acceso completo a la BD saltando RLS
supabase: Client = create_client(url, key)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def get_auth_token():
    """Extrae el token Bearer del encabezado Authorization."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


def require_auth(f):
    """Middleware para autenticar cualquier usuario registrado mediante su token Supabase JWT."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_auth_token()
        if not token:
            return jsonify({"success": False, "error": "Token de autorización requerido"}), 401
        
        try:
            user_response = supabase.auth.get_user(token)
            if not user_response or not user_response.user:
                return jsonify({"success": False, "error": "Sesión inválida o expirada"}), 401
            request.current_user = user_response.user
        except Exception as e:
            logging.warning(f"Fallo de autenticación: {e}")
            return jsonify({"success": False, "error": "Sesión no válida o expirada"}), 401
            
        return f(*args, **kwargs)
    return decorated


def require_superuser(f):
    """Middleware para verificar que el usuario autenticado sea superusuario (Admin)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_auth_token()
        if not token:
            return jsonify({"success": False, "error": "Token de autorización requerido"}), 401
        
        try:
            user_response = supabase.auth.get_user(token)
            if not user_response or not user_response.user:
                return jsonify({"success": False, "error": "Sesión inválida o expirada"}), 401
            
            user_id = user_response.user.id
            email = (user_response.user.email or "").lower()
            
            # Superusuario maestro garantizado
            is_super = email == 'festudio.desarrollos@gmail.com'
            if not is_super:
                profile = supabase.table('profiles').select('is_superuser').eq('id', user_id).single().execute()
                is_super = bool(profile.data and profile.data.get('is_superuser'))
            
            if not is_super:
                logging.warning(f"Acceso administrativo denegado a user_id={user_id}")
                return jsonify({"success": False, "error": "Acceso restringido: requiere privilegios de administrador"}), 403
            
            request.current_user = user_response.user
        except Exception as e:
            logging.error(f"Error al verificar permisos de administrador: {e}")
            return jsonify({"success": False, "error": "No autorizado para acceder a este recurso"}), 403
            
        return f(*args, **kwargs)
    return decorated


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "API de FEStudio funcionando"}), 200


# 0. Ruta para verificar el perfil y rol del usuario autenticado directamente en la base de datos
@app.route('/api/auth/profile', methods=['GET'])
@require_auth
def get_auth_profile():
    user_id = request.current_user.id
    email = (request.current_user.email or "").lower()
    is_master_super = email == 'festudio.desarrollos@gmail.com'
    
    try:
        profile_res = supabase.table('profiles').select('*').eq('id', user_id).execute()
        if profile_res.data and len(profile_res.data) > 0:
            profile_data = profile_res.data[0]
            # Si es el correo maestro y no estaba en True, sincronizarlo
            if is_master_super and not profile_data.get('is_superuser'):
                profile_data['is_superuser'] = True
                supabase.table('profiles').update({'is_superuser': True}).eq('id', user_id).execute()
            
            profile_data['is_superuser'] = bool(profile_data.get('is_superuser', False))
            return jsonify({"success": True, "profile": profile_data}), 200
        else:
            new_profile = {
                "id": user_id,
                "email": email,
                "is_superuser": is_master_super
            }
            supabase.table('profiles').upsert(new_profile).execute()
            return jsonify({"success": True, "profile": new_profile}), 200
            
    except Exception as e:
        logging.error(f"Error al obtener perfil de usuario {user_id}: {e}")
        return jsonify({
            "success": True,
            "profile": {
                "id": user_id,
                "email": email,
                "is_superuser": is_master_super
            }
        }), 200


# 1. Ruta pública para recibir consultas de la Landing Page
@app.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.get_json(silent=True) or {}
    full_name = str(data.get("full_name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    requirements = str(data.get("requirements", "")).strip()

    if not full_name or not email or not requirements:
        return jsonify({"success": False, "error": "Todos los campos son obligatorios"}), 400

    if len(full_name) > 100:
        return jsonify({"success": False, "error": "El nombre excede el límite permitido (100 caracteres)"}), 400

    if len(email) > 254 or not EMAIL_REGEX.match(email):
        return jsonify({"success": False, "error": "El correo electrónico no tiene un formato válido"}), 400

    if len(requirements) > 5000:
        return jsonify({"success": False, "error": "La descripción de requerimientos es demasiado extensa (máx 5000 caracteres)"}), 400

    try:
        response = supabase.table('contact_queries').insert({
            "full_name": full_name,
            "email": email,
            "requirements": requirements
        }).execute()
        return jsonify({"success": True, "data": response.data}), 201
    except Exception as e:
        logging.error(f"Error al registrar consulta de contacto: {e}")
        return jsonify({"success": False, "error": "No se pudo procesar la solicitud en este momento"}), 500


# 2. Ruta protegida para que los clientes creen tickets de soporte vinculados a una app específica
@app.route('/api/tickets', methods=['POST'])
@require_auth
def create_ticket():
    data = request.get_json(silent=True) or {}
    subject = str(data.get("subject", "")).strip()
    description = str(data.get("description", "")).strip()
    app_name = str(data.get("app_name", "")).strip()
    failure_type = str(data.get("failure_type", "")).strip()

    authenticated_user_id = request.current_user.id

    if not subject or not description:
        return jsonify({"success": False, "error": "El asunto y la descripción son obligatorios"}), 400

    if app_name and not subject.startswith(f"[{app_name}]"):
        subject = f"[{app_name}] {subject}"

    if len(subject) > 200:
        return jsonify({"success": False, "error": "El asunto es demasiado extenso (máx 200 caracteres)"}), 400

    extra_info = []
    if failure_type:
        extra_info.append(f"Tipo de incidencia: {failure_type}")
    if app_name:
        extra_info.append(f"Aplicación: {app_name}")
    
    if extra_info:
        full_description = f"{' | '.join(extra_info)}\n\nDetalle:\n{description}"
    else:
        full_description = description

    if len(full_description) > 5000:
        return jsonify({"success": False, "error": "La descripción es demasiado extensa (máx 5000 caracteres)"}), 400

    try:
        response = supabase.table('support_tickets').insert({
            "user_id": authenticated_user_id,
            "subject": subject,
            "description": full_description,
            "status": "Abierto"
        }).execute()
        return jsonify({"success": True, "data": response.data}), 201
    except Exception as e:
        logging.error(f"Error al crear ticket de soporte: {e}")
        return jsonify({"success": False, "error": "No se pudo registrar el ticket de soporte"}), 500


# 3. Ruta protegida para el Panel de Cliente: Licencias, Vencimientos, Tickets, Datos de Empresa y Facturas
@app.route('/api/client/dashboard', methods=['GET'])
@require_auth
def get_client_dashboard():
    user_id = request.current_user.id
    try:
        now_utc = datetime.now(timezone.utc)
        
        # 1. Licencias activas del cliente con app relacionada
        licenses_res = supabase.table('licenses').select('*, apps(*)').eq('user_id', user_id).execute()
        licenses = licenses_res.data or []
        
        for lic in licenses:
            created_at_str = lic.get("created_at")
            expires_at_str = lic.get("expires_at")
            try:
                if expires_at_str:
                    clean_exp = expires_at_str.replace("Z", "+00:00")
                    expiry_dt = datetime.fromisoformat(clean_exp)
                elif created_at_str:
                    clean_str = created_at_str.replace("Z", "+00:00")
                    created_dt = datetime.fromisoformat(clean_str)
                    expiry_dt = created_dt + timedelta(days=365)
                else:
                    expiry_dt = now_utc + timedelta(days=365)
            except Exception:
                expiry_dt = now_utc + timedelta(days=365)
                
            days_left = max(0, (expiry_dt - now_utc).days)
            lic["formatted_expiry"] = expiry_dt.strftime("%d/%m/%Y")
            lic["days_left"] = days_left
            
        # 2. Tickets de soporte del cliente
        tickets_res = supabase.table('support_tickets').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        tickets = tickets_res.data or []
        
        # 3. Datos de facturación de la empresa: Consultar tabla public.company_billing si existe, o user_metadata
        company_billing = {}
        try:
            billing_res = supabase.table('company_billing').select('*').eq('user_id', user_id).maybeSingle().execute()
            if billing_res.data:
                company_billing = billing_res.data
        except Exception:
            pass
            
        if not company_billing:
            user_metadata = request.current_user.user_metadata or {}
            company_billing = user_metadata.get("company_billing", {})
        
        # 4. Obtener facturas: Consultar tabla public.invoices si existe, o generar según licencias activas
        invoices = []
        try:
            inv_res = supabase.table('invoices').select('*, apps(name)').eq('user_id', user_id).order('created_at', desc=True).execute()
            if inv_res.data and len(inv_res.data) > 0:
                for item in inv_res.data:
                    item_app = item.get("apps", {})
                    app_label = item_app.get("name") if item_app else item.get("app_name", "FEStudio Software")
                    invoices.append({
                        "id": str(item.get("id")),
                        "invoice_number": item.get("invoice_number"),
                        "service_type": item.get("service_type"),
                        "concept": item.get("concept"),
                        "app_name": app_label,
                        "issue_date": str(item.get("issue_date")),
                        "due_date": str(item.get("due_date")),
                        "amount": float(item.get("amount", 0)),
                        "currency": item.get("currency", "ARS"),
                        "status": item.get("status", "Pagada"),
                        "cae": item.get("cae", ""),
                        "cae_due_date": str(item.get("cae_due_date", ""))
                    })
        except Exception:
            pass

        # Si aún no hay registros en la tabla invoices, generar según licencias activas
        if not invoices:
            if licenses:
                for idx, lic in enumerate(licenses):
                    app_name = lic.get("apps", {}).get("name") if lic.get("apps") else "Aplicación FEStudio"
                    inv_num = f"A-0001-{str(idx + 101).zfill(8)}"
                    created_at_str = lic.get("created_at")
                    try:
                        if created_at_str:
                            clean_str = created_at_str.replace("Z", "+00:00")
                            c_dt = datetime.fromisoformat(clean_str)
                        else:
                            c_dt = now_utc
                    except Exception:
                        c_dt = now_utc
                    
                    invoices.append({
                        "id": f"INV-{lic['id'][:8]}",
                        "invoice_number": inv_num,
                        "service_type": "Abono y Licencia Anual de Software",
                        "concept": f"Licencia de Uso & Soporte Técnico Anual - {app_name}",
                        "app_name": app_name,
                        "issue_date": c_dt.strftime("%d/%m/%Y"),
                        "due_date": (c_dt + timedelta(days=15)).strftime("%d/%m/%Y"),
                        "amount": 45000.0,
                        "currency": "ARS",
                        "status": "Pagada",
                        "cae": f"74391823091{idx}",
                        "cae_due_date": (c_dt + timedelta(days=25)).strftime("%d/%m/%Y")
                    })
            else:
                invoices.append({
                    "id": f"INV-BASE-{user_id[:6]}",
                    "invoice_number": "B-0001-00000042",
                    "service_type": "Servicio de Consultoría y Alta de Plataforma",
                    "concept": "Configuración inicial de cuenta y entorno cloud FEStudio",
                    "app_name": "FEStudio Cloud Platform",
                    "issue_date": now_utc.strftime("%d/%m/%Y"),
                    "due_date": (now_utc + timedelta(days=10)).strftime("%d/%m/%Y"),
                    "amount": 15000.0,
                    "currency": "ARS",
                    "status": "Pagada",
                    "cae": "71938472910384",
                    "cae_due_date": (now_utc + timedelta(days=20)).strftime("%d/%m/%Y")
                })

        return jsonify({
            "success": True,
            "licenses": licenses,
            "tickets": tickets,
            "company_billing": company_billing,
            "invoices": invoices
        }), 200
    except Exception as e:
        logging.error(f"Error al obtener dashboard de cliente {user_id}: {e}")
        return jsonify({"success": False, "error": "No se pudo recuperar la información del cliente"}), 500


# 4. Guardar datos fiscales y de facturación de la empresa
@app.route('/api/client/company-billing', methods=['POST'])
@require_auth
def save_company_billing():
    user_id = request.current_user.id
    data = request.get_json(silent=True) or {}
    
    billing_data = {
        "business_name": str(data.get("business_name", "")).strip(),
        "cuit": str(data.get("cuit", "")).strip(),
        "tax_condition": str(data.get("tax_condition", "Responsable Inscripto")).strip(),
        "address": str(data.get("address", "")).strip(),
        "city": str(data.get("city", "")).strip(),
        "province": str(data.get("province", "")).strip(),
        "postal_code": str(data.get("postal_code", "")).strip(),
        "billing_email": str(data.get("billing_email", "")).strip().lower(),
        "phone": str(data.get("phone", "")).strip()
    }
    
    try:
        # 1. Guardar en user_metadata (siempre persistente)
        admin_user = supabase.auth.admin.get_user_by_id(user_id)
        current_meta = admin_user.user.user_metadata or {}
        current_meta["company_billing"] = billing_data
        supabase.auth.admin.update_user_by_id(user_id, {
            "user_metadata": current_meta
        })

        # 2. Guardar en tabla company_billing si existe
        try:
            supabase.table('company_billing').upsert({
                "user_id": user_id,
                **billing_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as table_err:
            logging.info(f"Tabla company_billing aún no creada en BD (guardado en user_metadata): {table_err}")
        
        return jsonify({"success": True, "company_billing": billing_data}), 200
    except Exception as e:
        logging.error(f"Error al guardar datos de facturación para {user_id}: {e}")
        return jsonify({"success": False, "error": "Error interno al guardar los datos de facturación"}), 500


# 5. Ruta administrativa protegida: Solo accesible por Superusuarios autenticados
@app.route('/api/admin/dashboard', methods=['GET'])
@require_superuser
def get_admin_dashboard():
    try:
        queries = supabase.table('contact_queries').select('*').order('created_at', desc=True).execute()
        tickets = supabase.table('support_tickets').select('*, profiles(email)').order('created_at', desc=True).execute()
        apps = supabase.table('apps').select('*').order('created_at', desc=True).execute()
        licenses = supabase.table('licenses').select('*, apps(*), profiles(email)').order('created_at', desc=True).execute()
        clients = supabase.table('profiles').select('id, email, is_superuser, created_at').eq('is_superuser', False).order('email').execute()
        
        return jsonify({
            "success": True, 
            "queries": queries.data or [], 
            "tickets": tickets.data or [],
            "apps": apps.data or [],
            "licenses": licenses.data or [],
            "clients": clients.data or []
        }), 200
    except Exception as e:
        logging.error(f"Error al obtener datos del dashboard de administrador: {e}")
        return jsonify({"success": False, "error": "Error interno al recuperar información del dashboard"}), 500


@app.route('/api/admin/apps', methods=['POST'])
@require_superuser
def admin_create_app():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    url = str(data.get("url", "")).strip()
    description = str(data.get("description", "")).strip()
    
    if not name or not url:
        return jsonify({"success": False, "error": "El nombre y la URL de la aplicación son obligatorios"}), 400
        
    try:
        res = supabase.table('apps').insert({
            "name": name,
            "url": url,
            "description": description
        }).execute()
        return jsonify({"success": True, "data": res.data}), 201
    except Exception as e:
        logging.error(f"Error al registrar aplicación: {e}")
        return jsonify({"success": False, "error": "No se pudo crear la aplicación"}), 500


@app.route('/api/admin/apps/<app_id>', methods=['DELETE'])
@require_superuser
def admin_delete_app(app_id):
    try:
        supabase.table('licenses').delete().eq('app_id', app_id).execute()
        res = supabase.table('apps').delete().eq('id', app_id).execute()
        return jsonify({"success": True, "data": res.data}), 200
    except Exception as e:
        logging.error(f"Error al eliminar aplicación {app_id}: {e}")
        return jsonify({"success": False, "error": "No se pudo eliminar la aplicación"}), 500


@app.route('/api/admin/licenses', methods=['POST'])
@require_superuser
def admin_create_license():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    app_id = data.get("app_id")
    status = data.get("status", "active")
    
    if not user_id or not app_id:
        return jsonify({"success": False, "error": "El cliente y la aplicación son obligatorios"}), 400
        
    try:
        res = supabase.table('licenses').insert({
            "user_id": user_id,
            "app_id": app_id,
            "status": status
        }).execute()
        return jsonify({"success": True, "data": res.data}), 201
    except Exception as e:
        logging.error(f"Error al asignar licencia: {e}")
        return jsonify({"success": False, "error": "No se pudo asignar la licencia"}), 500


@app.route('/api/admin/licenses/<license_id>', methods=['DELETE'])
@require_superuser
def admin_delete_license(license_id):
    try:
        res = supabase.table('licenses').delete().eq('id', license_id).execute()
        return jsonify({"success": True, "data": res.data}), 200
    except Exception as e:
        logging.error(f"Error al eliminar licencia {license_id}: {e}")
        return jsonify({"success": False, "error": "No se pudo revocar la licencia"}), 500


@app.route('/api/admin/licenses/<license_id>', methods=['PATCH'])
@require_superuser
def admin_patch_license(license_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if not status or status not in ['active', 'inactive']:
        return jsonify({"success": False, "error": "Estado inválido"}), 400
        
    try:
        res = supabase.table('licenses').update({"status": status}).eq('id', license_id).execute()
        return jsonify({"success": True, "data": res.data}), 200
    except Exception as e:
        logging.error(f"Error al actualizar licencia {license_id}: {e}")
        return jsonify({"success": False, "error": "No se pudo actualizar el estado de la licencia"}), 500


@app.route('/api/admin/tickets/<ticket_id>', methods=['PATCH'])
@require_superuser
def admin_patch_ticket(ticket_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if not status:
        return jsonify({"success": False, "error": "Estado obligatorio"}), 400
        
    try:
        res = supabase.table('support_tickets').update({"status": status}).eq('id', ticket_id).execute()
        return jsonify({"success": True, "data": res.data}), 200
    except Exception as e:
        logging.error(f"Error al actualizar ticket {ticket_id}: {e}")
        return jsonify({"success": False, "error": "No se pudo actualizar el estado del ticket"}), 500


if __name__ == '__main__':
    is_debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host='0.0.0.0', port=5000, debug=is_debug)
