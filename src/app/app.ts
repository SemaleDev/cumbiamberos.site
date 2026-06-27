import { Component, signal, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CumbiamberosService, InstagramPost, CumbiaEvent, WeeklySong } from './cumbiamberos.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly cumbiamberosService = inject(CumbiamberosService);

  readonly posts       = this.cumbiamberosService.posts;
  readonly events      = this.cumbiamberosService.events;
  readonly weeklySongs = this.cumbiamberosService.weeklySongs;

  readonly activeTab = signal<'gallery' | 'events' | 'music' | 'collectives'>('gallery');

  // Modal de Login Oculto
  readonly showLoginModal = signal(false);

  // Admin State sincronizado con Firebase Auth
  readonly isAdmin = this.cumbiamberosService.isAdmin;
  loginPassword = '';
  showLoginError = false;
  isLoggingIn = false;

  // Protección contra fuerza bruta
  loginAttempts = 0;
  loginLockedUntil = 0;
  loginLockCountdown = 0;
  private lockTimer: any = null;

  // Modales principales
  readonly showPostModal  = signal(false);
  readonly showEventModal = signal(false);
  readonly showSongModal  = signal(false);

  // Estado de subida de imágenes
  isUploadingImages = false;
  pendingFiles: File[] = [];

  // Post Carousel State
  readonly carouselIndexes = signal<Record<string, number>>({});

  newPost = {
    postUrl: '',
    place: '',
    date: '',
    artists: '',
    description: '',
    imageUrls: [] as string[]
  };

  newEvent = {
    title: '',
    date: '',
    time: '',
    place: '',
    artists: '',
    price: '',
    description: '',
    instagramUrl: ''
  };

  newSong = {
    title: '',
    artist: '',
    year: '',
    youtubeUrl: '',
    reason: ''
  };

  readonly playingSongId = signal<string | null>(null);

  // Editing States
  editingPostId:  string | null = null;
  editingEventId: string | null = null;
  editingSongId:  string | null = null;

  // Colectivos / Personas Aliadxs
  readonly collectives = [
    { 
      name: 'Photaurino', 
      url: 'https://www.instagram.com/photaurino/', 
      class: 'tag-green',
      role: 'fotografo',
      description: 'Capturando la memoria cumbiera y la cultura de calle en Medellín.'
    },
    { 
      name: 'Insane Sebas', 
      url: 'https://www.instagram.com/insane.sebas/', 
      class: 'tag-yellow',
      role: 'Amante de la cumbia',
      description: 'Amor y locura por los ritmos tropicales en vinilo.'
    },
    { 
      name: 'Zykh', 
      url: 'https://www.instagram.com/zykh_/', 
      class: 'tag-cyan',
      role: 'Artista',
      description: 'Difusion de la cumbia a través de la consola.'
    },
    { 
      name: 'El santa Muertero', 
      url: 'https://www.instagram.com/elsantamuertero/', 
      class: 'tag-pink',
      role: 'Artista',
      description: 'Brujo Selector Cumbio/Futurista.'
    },
    { 
      name: 'El emperador de la cumbia', 
      url: 'https://www.instagram.com/elemperadordelacumbia/', 
      class: 'tag-green',
      role: 'Artista',
      description: 'Trabajando por la Cumbia.'
    },
    { 
      name: 'El ultimo romantico', 
      url: 'https://www.instagram.com/elultimoromanticooficial/', 
      class: 'tag-yellow',
      role: 'Artista',
      description: 'Karaoke+Romance+Pop +Nois+Kumbia+Mäkina.'
    },
    
{ 
      name: 'Ña', 
      url: 'https://www.instagram.com/nasita4a/', 
      class: 'tag-cyan',
      role: 'Artista',
      description: 'Vigor y ternura en la cumbia.'
    },
    
    { 
      name: 'MeliMela', 
      url: 'https://www.instagram.com/qmeluria/', 
      class: 'tag-pink',
      role: 'Artista',
      description: 'Bienvenido a la Melomanía de la cumbia.'
    },
    { 
      name: 'Nina Folklore', 
      url: 'https://www.instagram.com/ninafolklore_/', 
      class: 'tag-green',
      role: 'Artista',
      description: 'Melomana e Interdisciplinaria.'
    },
    { 
      name: 'Caos Carolina', 
      url: 'https://www.instagram.com/caoscarolina/', 
      class: 'tag-yellow',
      role: 'Artista',
      description: 'Dj Selectora.'
    },
    
    { 
      name: 'CUMBIA TODO EL AÑO', 
      url: 'https://www.instagram.com/cumbiatodoelanio/', 
      class: 'tag-cyan',
      role: 'Colectivo',
      description: 'Colectivo cumbiero de la ciudad de Medellín, gestionando eventos y actividades.'
    },
    { 
      name: 'ojalamemuera999', 
      url: 'https://www.instagram.com/ojalamemuera999/', 
      class: 'tag-green',
      role: 'Artista',
      description: 'Sonido999. Dj vinilero, selector de cumbia y noise'
    },
     { 
      name: 'La Búha Despierta', 
      url: 'https://www.instagram.com/la_buha_despierta/', 
      class: 'tag-yellow',
      role: 'Artista',
      description: 'Dj Selector.'
    },
    { 
      name: 'Sonico Fatal', 
      url: 'https://www.instagram.com/sonicofatal/', 
      class: 'tag-pink',
      role: 'Artista',
      description: 'DJ-Productor Kumbia Medellín.'
    }

    
  ];

  constructor() {
    // Si se accede con ?admin=true o ?login=true, abrir el login secreto
    const params = new URLSearchParams(window.location.search);
    if (params.has('admin') || params.has('login')) {
      this.showLoginModal.set(true);
      // Limpiar los parámetros de la URL para que no sea obvio para otros
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // ── Navegación ───────────────────────────────────────────────
  selectTab(tab: 'gallery' | 'events' | 'music' | 'collectives') {
    this.activeTab.set(tab);
  }

  // ── Login Secreto ─────────────────────────────────────────────
  openAdminLogin() {
    this.showLoginModal.set(true);
  }

  closeLoginModal() {
    this.showLoginModal.set(false);
    this.loginPassword = '';
    this.showLoginError = false;
    this.loginLockCountdown = 0;
    if (this.lockTimer) {
      clearInterval(this.lockTimer);
      this.lockTimer = null;
    }
  }

  async attemptLogin() {
    if (!this.loginPassword) return;

    // Comprobar si está bloqueado por demasiados intentos
    const now = Date.now();
    if (this.loginLockedUntil > now) {
      return; // Silenciosamente ignorar si está bloqueado
    }

    this.isLoggingIn = true;
    this.showLoginError = false;

    const ok = await this.cumbiamberosService.loginAdmin(this.loginPassword);

    if (ok) {
      this.loginAttempts = 0;
      this.loginLockedUntil = 0;
      this.closeLoginModal();
    } else {
      this.loginAttempts++;
      this.showLoginError = true;

      // Bloquear tras 3 intentos fallidos
      if (this.loginAttempts >= 3) {
        const lockDuration = 30000; // 30 segundos
        this.loginLockedUntil = Date.now() + lockDuration;
        this.loginLockCountdown = 30;
        this.loginAttempts = 0;

        // Contar regresivamente para mostrar al usuario
        this.lockTimer = setInterval(() => {
          this.loginLockCountdown--;
          if (this.loginLockCountdown <= 0) {
            clearInterval(this.lockTimer);
            this.lockTimer = null;
            this.loginLockCountdown = 0;
            this.showLoginError = false;
          }
        }, 1000);
      }
    }
    this.isLoggingIn = false;
  }

  async logout() {
    await this.cumbiamberosService.logoutAdmin();
  }

  // ── Carousel ─────────────────────────────────────────────────
  getCarouselIndex(postId: string): number {
    return this.carouselIndexes()[postId] || 0;
  }

  nextImage(postId: string, totalImages: number) {
    const current = this.getCarouselIndex(postId);
    this.carouselIndexes.update(i => ({ ...i, [postId]: (current + 1) % totalImages }));
  }

  prevImage(postId: string, totalImages: number) {
    const current = this.getCarouselIndex(postId);
    this.carouselIndexes.update(i => ({ ...i, [postId]: current === 0 ? totalImages - 1 : current - 1 }));
  }

  // ── Subida de imágenes a Firebase Storage ───────────────────
  onFilesSelected(event: any) {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      // Guardar archivos pendientes y mostrar preview local
      for (let i = 0; i < files.length; i++) {
        this.pendingFiles.push(files[i]);
        const reader = new FileReader();
        reader.onload = (e) => {
          // Preview temporal (base64) — se reemplazará con la URL de Storage al guardar
          this.newPost.imageUrls = [...this.newPost.imageUrls, e.target?.result as string];
        };
        reader.readAsDataURL(files[i]);
      }
    }
  }

  removeNewPostImage(index: number) {
    this.newPost.imageUrls.splice(index, 1);
    this.pendingFiles.splice(index, 1);
  }

  // ── Posts ────────────────────────────────────────────────────
  openPostModal() {
    if (!this.isAdmin()) return;
    this.editingPostId = null;
    this.resetPostForm();
    this.showPostModal.set(true);
  }

  editPost(post: InstagramPost) {
    if (!this.isAdmin()) return;
    this.editingPostId = post.id;
    this.newPost = {
      postUrl:     post.postUrl,
      place:       post.place,
      date:        post.date,
      artists:     post.artists,
      description: post.description,
      imageUrls:   [...post.imageUrls]
    };
    this.pendingFiles = [];
    this.showPostModal.set(true);
  }

  async deletePost(id: string) {
    if (this.isAdmin() && window.confirm('¿Seguro que deseas eliminar esta publicación? También se borrarán las fotos.')) {
      this.cumbiamberosService.deletePost(id).catch(err => console.error('Error al borrar post:', err));
    }
  }

  closePostModal() {
    this.showPostModal.set(false);
    this.resetPostForm();
    this.editingPostId = null;
  }

  async submitPost() {
    if (!this.newPost.place || !this.newPost.date) return;

    this.isUploadingImages = true;
    let finalImageUrls = this.newPost.imageUrls.filter(u => u.startsWith('http'));

    try {
      // Subir los archivos nuevos a ImgBB
      if (this.pendingFiles.length > 0) {
        const uploadedUrls = await this.cumbiamberosService.uploadImages(this.pendingFiles);
        finalImageUrls = [...finalImageUrls, ...uploadedUrls];
      }

      const postData = {
        postUrl:     this.newPost.postUrl,
        place:       this.newPost.place,
        date:        this.newPost.date,
        artists:     this.newPost.artists || 'Varios Artistas',
        description: this.newPost.description || 'Sin descripción',
        imageUrls:   finalImageUrls
      };

      if (this.editingPostId) {
        this.cumbiamberosService.updatePost(this.editingPostId, postData).catch(err => console.error('Error al actualizar post:', err));
      } else {
        this.cumbiamberosService.addPost(postData).catch(err => console.error('Error al guardar post:', err));
      }

      this.closePostModal();
    } catch (error: any) {
      console.error('Error al guardar el post:', error);
      alert('Hubo un error al subir las imágenes o guardar los datos. Por favor revisa la consola para más detalles.');
    } finally {
      this.isUploadingImages = false;
    }
  }

  private resetPostForm() {
    this.newPost = { postUrl: '', place: '', date: '', artists: '', description: '', imageUrls: [] };
    this.pendingFiles = [];
  }

  // ── Events ───────────────────────────────────────────────────
  openEventModal() {
    if (!this.isAdmin()) return;
    this.editingEventId = null;
    this.resetEventForm();
    this.showEventModal.set(true);
  }

  editEvent(event: CumbiaEvent) {
    if (!this.isAdmin()) return;
    this.editingEventId = event.id;
    this.newEvent = {
      title:        event.title,
      date:         event.date,
      time:         event.time,
      place:        event.place,
      artists:      event.artists,
      price:        event.price,
      description:  event.description,
      instagramUrl: event.instagramUrl || ''
    };
    this.showEventModal.set(true);
  }

  async deleteEvent(id: string) {
    if (this.isAdmin() && window.confirm('¿Seguro que deseas eliminar este evento?')) {
      this.cumbiamberosService.deleteEvent(id).catch(err => console.error('Error al borrar evento:', err));
    }
  }

  closeEventModal() {
    this.showEventModal.set(false);
    this.resetEventForm();
    this.editingEventId = null;
  }

  async submitEvent() {
    if (!this.newEvent.title || !this.newEvent.date || !this.newEvent.place) return;
    const colors: ('pink' | 'green' | 'yellow' | 'cyan')[] = ['pink', 'green', 'yellow', 'cyan'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const eventData = {
      title:        this.newEvent.title.toUpperCase(),
      date:         this.newEvent.date.toUpperCase(),
      time:         this.newEvent.time || '8:00 PM',
      place:        this.newEvent.place.toUpperCase(),
      artists:      this.newEvent.artists.toUpperCase() || 'ARTISTAS POR CONFIRMAR',
      price:        this.newEvent.price || 'ENTRADA LIBRE',
      description:  this.newEvent.description || '',
      posterColor:  randomColor,
      instagramUrl: this.newEvent.instagramUrl || undefined
    };

    if (this.editingEventId) {
      this.cumbiamberosService.updateEvent(this.editingEventId, eventData).catch(err => console.error('Error al actualizar evento:', err));
    } else {
      this.cumbiamberosService.addEvent(eventData).catch(err => console.error('Error al guardar evento:', err));
    }
    this.closeEventModal();
  }

  private resetEventForm() {
    this.newEvent = { title: '', date: '', time: '', place: '', artists: '', price: '', description: '', instagramUrl: '' };
  }

  // ── Songs ────────────────────────────────────────────────────
  openSongModal() {
    if (!this.isAdmin()) return;
    this.editingSongId = null;
    this.resetSongForm();
    this.showSongModal.set(true);
  }

  editSong(song: WeeklySong) {
    if (!this.isAdmin()) return;
    this.editingSongId = song.id;
    this.newSong = {
      title:      song.title,
      artist:     song.artist,
      year:       song.year,
      youtubeUrl: song.youtubeUrl,
      reason:     song.reason
    };
    this.showSongModal.set(true);
  }

  async deleteSong(id: string) {
    if (this.isAdmin() && window.confirm('¿Seguro que deseas eliminar esta canción?')) {
      this.cumbiamberosService.deleteSong(id).catch(err => console.error('Error al borrar canción:', err));
    }
  }

  closeSongModal() {
    this.showSongModal.set(false);
    this.resetSongForm();
    this.editingSongId = null;
  }

  async submitSong() {
    if (!this.newSong.title || !this.newSong.artist || !this.newSong.youtubeUrl) return;
    const songData = {
      title:      this.newSong.title,
      artist:     this.newSong.artist,
      year:       this.newSong.year,
      youtubeUrl: this.newSong.youtubeUrl,
      reason:     this.newSong.reason || 'Sugerencia agregada recientemente.',
      spotifyUrl: '',
      coverUrl:   ''
    };

    if (this.editingSongId) {
      this.cumbiamberosService.updateSong(this.editingSongId, songData).catch(err => console.error('Error al actualizar canción:', err));
    } else {
      this.cumbiamberosService.addSong(songData).catch(err => console.error('Error al guardar canción:', err));
    }
    this.closeSongModal();
  }

  private resetSongForm() {
    this.newSong = { title: '', artist: '', year: '', youtubeUrl: '', reason: '' };
  }

  // ── Reproductor ──────────────────────────────────────────────
  playSong(song: WeeklySong) {
    this.playingSongId.set(song.id);
    setTimeout(() => {
      this.playingSongId.set(null);
      window.open(song.youtubeUrl, '_blank');
    }, 800);
  }
}
