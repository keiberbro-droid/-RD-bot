import uvicorn
from fastapi import FastAPI
from pywa import WhatsApp, filters
from pywa.types import Message, MessageType

# -------------------------------------------------------------------
# CONFIGURACIÓN DEL BOT - ¡IMPORTANTE!
# -------------------------------------------------------------------
# Reemplaza los siguientes valores con tus propias credenciales.
# Las puedes encontrar en tu panel de desarrollador de Meta/Facebook.

# Tu token de verificación (la misma que usaste en el panel de Meta).
VERIFY_TOKEN = "TU_VERIFY_TOKEN_AQUI"

# Tu token de acceso de la API de WhatsApp Cloud.
ACCESS_TOKEN = "TU_ACCESS_TOKEN_AQUI"

# El ID de tu número de teléfono de WhatsApp.
PHONE_ID = "TU_PHONE_ID_AQUI"

# -------------------------------------------------------------------
# INICIALIZACIÓN DEL BOT
# -------------------------------------------------------------------

fastapi_app = FastAPI()

wa = WhatsApp(
    phone_id=PHONE_ID,
    token=ACCESS_TOKEN,
    server=fastapi_app,
    verify_token=VERIFY_TOKEN,
)

# -------------------------------------------------------------------
# MANEJADORES DE EVENTOS (HANDLERS)
# -------------------------------------------------------------------

@wa.on_message(filters.message_type(MessageType.SYSTEM))
def handle_group_events(client: WhatsApp, msg: Message):
    """
    Gestiona los eventos de sistema en un grupo (unirse/salir).
    """
    if msg.system.type == 'user_added':
        print(f"Usuario añadido al grupo {msg.chat.id}. Enviando bienvenida.")
        client.send_message(
            to=msg.chat.id,
            text="bienvenido mi pequeño saltamonte"
        )
    elif msg.system.type == 'user_removed':
        print(f"Usuario eliminado del grupo {msg.chat.id}. Enviando despedida.")
        client.send_message(
            to=msg.chat.id,
            text="lárgate nadie te extrañará"
        )

# Este handler es para que puedas probar que el bot responde a mensajes directos.
@wa.on_message(filters.text)
def handle_text_messages(client: WhatsApp, msg: Message):
    """
    Responde a mensajes de texto para verificar que el bot está funcionando.
    """
    # Solo responde si el mensaje no es de un grupo
    if not msg.chat.is_group:
        print(f"Recibido mensaje de texto de {msg.from_user.wa_id}")
        msg.reply_text("Hola! Soy un bot y estoy funcionando.")


# -------------------------------------------------------------------
# EJECUCIÓN DEL SERVIDOR
# -------------------------------------------------------------------

if __name__ == "__main__":
    print("Iniciando el servidor del bot...")
    print("Para detenerlo, presiona CTRL+C.")
    uvicorn.run(fastapi_app, host="0.0.0.0", port=8000)
