from flask import Flask, jsonify, request
from flask_cors import CORS
from functools import wraps
import os
import re
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Configurar logging seguro
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

app = Flask(__name__)

# Configuración de CORS permitiendo orígenes locales (puertos 5173 y 5174)
allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
).split(",")

CORS(
    app,
    resources={r"/api/*": {"origins": allowed_origins}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"]
)

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

if not url or not key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be defined in environment")

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
            profile = supabase.table('profiles').select('is_superuser').eq('id', user_id).single().execute()
            
            if not profile.data or not profile.data.get('is_superuser'):
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


# 1. Ruta pública para recibir consultas de la Landing Page (con validaciones de longitud y formato)
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


# 2. Ruta protegida para que los clientes creen tickets de soporte vinculados a su usuario verificado
@app.route('/api/tickets', methods=['POST'])
@require_auth
def create_ticket():
    data = request.get_json(silent=True) or {}
    subject = str(data.get("subject", "")).strip()
    description = str(data.get("description", "")).strip()

    # Prevenir suplantación de identidad: usar id del usuario autenticado en el token
    authenticated_user_id = request.current_user.id

    if not subject or not description:
        return jsonify({"success": False, "error": "El asunto y la descripción son obligatorios"}), 400

    if len(subject) > 200:
        return jsonify({"success": False, "error": "El asunto es demasiado extenso (máx 200 caracteres)"}), 400

    if len(description) > 5000:
        return jsonify({"success": False, "error": "La descripción es demasiado extensa (máx 5000 caracteres)"}), 400

    try:
        response = supabase.table('support_tickets').insert({
            "user_id": authenticated_user_id,
            "subject": subject,
            "description": description
        }).execute()
        return jsonify({"success": True, "data": response.data}), 201
    except Exception as e:
        logging.error(f"Error al crear ticket de soporte: {e}")
        return jsonify({"success": False, "error": "No se pudo registrar el ticket de soporte"}), 500


# 3. Ruta administrativa protegida: Solo accesible por Superusuarios autenticados
@app.route('/api/admin/dashboard', methods=['GET'])
@require_superuser
def get_admin_dashboard():
    try:
        # Traer consultas de contacto ordenadas por fecha
        queries = supabase.table('contact_queries').select('*').order('created_at', desc=True).execute()
        
        # Traer tickets de soporte e incluir el email del perfil asociado
        tickets = supabase.table('support_tickets').select('*, profiles(email)').order('created_at', desc=True).execute()
        
        return jsonify({
            "success": True, 
            "queries": queries.data, 
            "tickets": tickets.data
        }), 200
    except Exception as e:
        logging.error(f"Error al obtener datos del dashboard de administrador: {e}")
        return jsonify({"success": False, "error": "Error interno al recuperar información del dashboard"}), 500


if __name__ == '__main__':
    is_debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host='0.0.0.0', port=5000, debug=is_debug)