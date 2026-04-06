export const contenidoSeccionContacto = {
  mensajeWhatsapp: 'Hola, necesito más información sobre la venta de palomitas',
  tarjetaContacto: {
    sobretitulo: 'Contacto',
    titulo: 'Hablemos de tu pedido sin vueltas.',
    etiquetas: {
      nombre: 'Nombre de contacto',
      correo: 'Correo electrónico',
      whatsapp: 'WhatsApp'
    },
    botonWhatsapp: 'Mandar mensaje por WhatsApp'
  },
  formularioContacto: {
    sobretitulo: 'Déjanos tu contacto',
    titulo: 'Regístrate y te contactamos para ayudarte con tu pedido.',
    campos: {
      etiquetaNombre: 'Nombre',
      placeholderNombre: 'Tu nombre',
      etiquetaCorreo: 'Correo electrónico',
      placeholderCorreo: 'correo@ejemplo.com',
      etiquetaTelefono: 'Teléfono (opcional)',
      placeholderTelefono: 'Tu número de teléfono',
      etiquetaPregunta: 'Pregunta (opcional)',
      placeholderPregunta: 'Cuéntanos qué necesitas y te responderemos',
      etiquetaPromociones: 'Quiero recibir promociones y novedades'
    },
    botonEnviar: 'Registrar contacto',
    botonEnviando: 'Registrando...',
    mensajeExito: 'Gracias. Tus datos fueron registrados correctamente. ',
    mensajeError: 'No se pudo registrar tu contacto. Intenta nuevamente.'
  }
} as const; 