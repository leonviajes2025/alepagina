export const contenidoNavegacion = {
  lemaMarca: 'Palomitas gourmet',
  ariaMenu: 'Abrir menu principal',
  ariaNavegacion: 'Principal',
  ariaAccesosRapidos: 'Accesos rápidos',
  ariaAtajosMoviles: 'Atajos móviles',
  enlacesPrincipales: [
    { etiqueta: 'Inicio', ancla: '#inicio' },
    { etiqueta: 'Sabores', ancla: '#productos' },
    { etiqueta: 'Eventos', ancla: '#servicios' },
    { etiqueta: 'Déjanos tu contacto', ancla: '#dejanos-tu-contacto' },
    { etiqueta: 'Contacto', ancla: '#contacto' },
    { etiqueta: 'Cotiza', ancla: '#cotizacion' }
  ],
  enlacesMoviles: [
    { etiqueta: 'Sabores', ancla: '#productos' },
    { etiqueta: 'Cotiza', ancla: '#cotizacion' },
    { etiqueta: 'Contacto', ancla: '#dejanos-tu-contacto' }
  ]
} as const;