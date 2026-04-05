export const contenidoSeccionCotizacion = {
  sobretitulo: 'Cotización',
  titulo: 'Calcula un estimado claro para tu evento.',
  botonLimpiar: 'Limpiar cotización',
  etiquetaEntrega: 'Agregar entrega a domicilio',
  etiquetasResumen: {
    totalPiezas: 'Total de piezas',
    saladas: 'Saladas',
    dulces: 'Dulces',
    saboresElegidos: 'Sabores elegidos',
    subtotal: 'Subtotal',
    entrega: 'Entrega',
    totalEstimado: 'Total estimado',
    enviarCotizacion: 'Enviar cotización',
    nombreCotizacion: 'Nombre para la cotización',
    placeholderNombreCotizacion: 'Opcional'
  },
  mensajeVacio: 'Aún no has agregado piezas por sabor.',
  botonEnviar: 'Mandar cotización por WhatsApp',
  botonEnviando: 'Enviando...',
  advertenciaSoloApi: 'Activa la cotización solo con productos cargados desde la API. Revisa la conexión e intenta nuevamente.',
  nota: 'El cálculo es informativo y no reemplaza una cotización final. Captura cuántas piezas quieres de cada sabor y el estimado separa automáticamente saladas, dulces y entrega para que todo se entienda rápido.',
  mensajeSolicitud: {
    introduccion: 'Hola, me interesa una cotización de palomitas gourmet para mi evento.',
    etiquetaNombre: 'Nombre',
    etiquetaSabores: 'Sabores solicitados:',
    mensajeSinSabores: 'Sin sabores seleccionados todavía.',
    etiquetaTotalPiezas: 'Total de piezas',
    etiquetaSubtotalSaladas: 'Subtotal saladas',
    etiquetaSubtotalDulces: 'Subtotal dulces',
    etiquetaEntrega: 'Entrega',
    etiquetaTotalEstimado: 'Total estimado',
    etiquetaEntregaSi: 'Sí',
    etiquetaEntregaNo: 'No'
  },
  mensajeExito: 'Cotización registrada. Abrimos WhatsApp para continuar la conversación.',
  mensajeError: 'No fue posible registrar la cotización por ahora. Intenta nuevamente.'
} as const;