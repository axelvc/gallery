export const resources = {
  en: {
    translation: {
      entry: {
        title: 'Build your gallery',
        startBlank: 'Start blank',
        useProfile: 'Use a profile',
        useProfileCopy: 'Enter a public Instagram username, verify it, and open the gallery with that profile loaded.',
        formTitle: 'Find an Instagram profile',
        continue: 'Continue to gallery'
      },
      home: {
        tabTitle: 'Gallery',
        defaultDisplayName: 'Duck Gallery',
        blankProfileName: 'username',
        blankProfileDisplayName: 'Instagram profile',
        defaultBio:
          'Curate your photos in profile order. Add images from your library, then long-press any tile to move it around the grid.',
        blankProfileBio:
          'This profile could not be loaded. Try another public Instagram username or add your own photos below.',
        importedProfileBio: 'Public Instagram profile imported into your grid.',
        stats: {
          posts: 'posts',
          followers: 'followers',
          following: 'following'
        },
        sourceNote:
          'Loaded from public profile HTML. Stats and avatar are available, but recent images may be limited.',
        usernamePlaceholder: 'instagram username',
        addPhotos: 'Add photos',
        removePhoto: 'Remove photo',
        opening: 'Opening...',
        loading: 'Loading',
        refreshProfile: 'Refresh profile',
        menu: {
          title: 'Menu',
          refresh: 'Refresh',
          reset: 'Reset',
          back: 'Back',
          cancel: 'Cancel'
        },
        tryProfile: 'Try profile',
        newHighlight: 'New',
        emptyTitle: 'Share your first photo',
        alerts: {
          usernameNeededTitle: 'Username needed',
          usernameNeededMessage: 'Enter an Instagram username to load a public profile grid.',
          privateProfileTitle: 'Private profile',
          privateProfileMessage:
            'That Instagram account is private, so its posts cannot be used for the grid.',
          profileBlockedTitle: 'Instagram blocked this request',
          profileBlockedMessage:
            'Instagram didn’t allow this network to load the profile. Try again later or switch networks.',
          profileNotFoundTitle: 'Profile not found',
          profileNotFoundMessage:
            'That Instagram username does not exist. Try another public account.',
           proxyNotConfiguredTitle: 'Proxy not configured',
           proxyNotConfiguredMessage:
            'If Instagram blocks direct loading, set EXPO_PUBLIC_INSTAGRAM_PROXY_URL or run npm run instagram-proxy before loading a profile.',
          profileUnavailableTitle: 'Profile unavailable',
          profileUnavailableMessage:
            'Instagram did not return a usable public profile. The grid has been cleared.',
          photoAccessNeededTitle: 'Photo access needed',
          photoAccessNeededMessage:
            'Please allow photo library access so you can build your gallery grid.',
          unableToOpenGalleryTitle: 'Unable to open gallery',
          unableToOpenGalleryMessage: 'Please try picking your photos again.'
        }
      }
    }
  },
  es: {
    translation: {
      entry: {
        title: 'Crea tu galería',
        startBlank: 'Comenzar en blanco',
        useProfile: 'Usar un perfil',
        useProfileCopy: 'Escribe un usuario público de Instagram, verifícalo y abre la galería con ese perfil cargado.',
        formTitle: 'Buscar un perfil de Instagram',
        continue: 'Continuar a la galería'
      },
      home: {
        tabTitle: 'Galería',
        defaultDisplayName: 'Galería Duck',
        blankProfileName: 'usuario',
        blankProfileDisplayName: 'Perfil de Instagram',
        defaultBio:
          'Organiza tus fotos como un perfil. Agrega imágenes desde tu galería y mantén presionada cualquier foto para moverla dentro de la cuadrícula.',
        blankProfileBio:
          'No se pudo cargar este perfil. Prueba con otro usuario público de Instagram o agrega tus propias fotos abajo.',
        importedProfileBio: 'Perfil público de Instagram importado en tu cuadrícula.',
        stats: {
          posts: 'publicaciones',
          followers: 'seguidores',
          following: 'seguidos'
        },
        sourceNote:
          'Cargado desde el HTML público del perfil. Las estadísticas y el avatar están disponibles, pero las imágenes recientes pueden ser limitadas.',
        usernamePlaceholder: '@usuario',
        addPhotos: 'Agregar fotos',
        removePhoto: 'Eliminar foto',
        opening: 'Abriendo...',
        loading: 'Cargando',
        refreshProfile: 'Actualizar perfil',
        menu: {
          title: 'Menú',
          refresh: 'Refrescar',
          reset: 'Reiniciar',
          back: 'Volver',
          cancel: 'Cancelar'
        },
        tryProfile: 'Probar perfil',
        newHighlight: 'Nuevo',
        emptyTitle: 'Agregar tus primeras fotos',
        alerts: {
          usernameNeededTitle: 'Nombre de usuario requerido',
          usernameNeededMessage:
            'Escribe un nombre de usuario de Instagram para cargar una cuadrícula desde un perfil público.',
          privateProfileTitle: 'Perfil privado',
          privateProfileMessage:
            'Esa cuenta de Instagram es privada, así que sus publicaciones no se pueden usar en la cuadrícula.',
          profileBlockedTitle: 'Instagram bloqueó esta solicitud',
          profileBlockedMessage:
            'Instagram no permitió que esta red cargue el perfil. Intenta más tarde o cambia de red.',
          profileNotFoundTitle: 'Perfil no encontrado',
          profileNotFoundMessage:
            'Ese nombre de usuario de Instagram no existe. Prueba con otra cuenta pública.',
           proxyNotConfiguredTitle: 'Proxy sin configurar',
           proxyNotConfiguredMessage:
            'Si Instagram bloquea la carga directa, configura EXPO_PUBLIC_INSTAGRAM_PROXY_URL o ejecuta npm run instagram-proxy antes de cargar un perfil.',
          profileUnavailableTitle: 'Perfil no disponible',
          profileUnavailableMessage:
            'Instagram no devolvió un perfil público utilizable. La cuadrícula se limpió.',
          photoAccessNeededTitle: 'Se necesita acceso a las fotos',
          photoAccessNeededMessage:
            'Permite el acceso a tu galería para que puedas construir tu cuadrícula.',
          unableToOpenGalleryTitle: 'No se pudo abrir la galería',
          unableToOpenGalleryMessage: 'Intenta seleccionar tus fotos nuevamente.'
        }
      }
    }
  }
} as const;

export type AppLanguage = keyof typeof resources;
export const defaultNS = 'translation';
