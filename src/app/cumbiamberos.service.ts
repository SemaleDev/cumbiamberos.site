import { Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { environment } from '../environments/environment';

// Inicialización directa de Firebase y Firestore con caché persistente (IndexedDB)
const app = initializeApp(environment.firebase);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
const auth = getAuth(app);

export interface InstagramPost {
  id: string;
  postUrl: string;
  place: string;
  date: string;
  artists: string;
  description: string;
  imageUrls: string[];
  createdAt?: any;
}

export interface CumbiaEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
  artists: string;
  price: string;
  description: string;
  posterColor: 'pink' | 'green' | 'yellow' | 'cyan';
  instagramUrl?: string;
  createdAt?: any;
}

export interface WeeklySong {
  id: string;
  title: string;
  artist: string;
  year: string;
  spotifyUrl: string;
  youtubeUrl: string;
  reason: string;
  coverUrl: string;
  createdAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CumbiamberosService {
  // Estado de administrador sincronizado con Firebase Auth
  readonly isAdmin = signal(false);
  readonly ADMIN_UID = 'l8bX4STURtg425b5PrPyqOiltey2';

  constructor() {
    // Escuchar el estado de autenticación de Firebase en tiempo real
    onAuthStateChanged(auth, (user) => {
      if (user && user.uid === this.ADMIN_UID) {
        this.isAdmin.set(true);
      } else {
        this.isAdmin.set(false);
      }
    });
  }

  // Método seguro para iniciar sesión directamente contra los servidores de Firebase
  async loginAdmin(password: string): Promise<boolean> {
    try {
      await signInWithEmailAndPassword(auth, 'sebastian77994@gmail.com', password);
      return true;
    } catch (error) {
      console.error('Error de autenticación:', error);
      return false;
    }
  }

  async logoutAdmin(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  // ── Collections ──────────────────────────────────────────────
  private postsCol  = collection(db, 'posts');
  private eventsCol = collection(db, 'events');
  private songsCol  = collection(db, 'songs');

  // ── Live queries usando el listener en tiempo real nativo de Firebase ────────
  private posts$ = new Observable<InstagramPost[]>(subscriber => {
    const q = query(this.postsCol, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      snap => {
        const postsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as InstagramPost));
        subscriber.next(postsList);
      },
      err => {
        console.error('Error al cargar Mural de Fotos:', err);
        subscriber.next([]);
      }
    );
  });

  private events$ = new Observable<CumbiaEvent[]>(subscriber => {
    const q = query(this.eventsCol, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      snap => {
        const eventsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as CumbiaEvent));
        subscriber.next(eventsList);
      },
      err => {
        console.error('Error al cargar Eventos:', err);
        subscriber.next([]);
      }
    );
  });

  private songs$ = new Observable<WeeklySong[]>(subscriber => {
    const q = query(this.songsCol, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      snap => {
        const songsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeeklySong));
        subscriber.next(songsList);
      },
      err => {
        console.error('Error al cargar Sonido de la Semana:', err);
        subscriber.next([]);
      }
    );
  });

  // ── Signals ───────────────────────────────────────────────────
  readonly posts       = toSignal(this.posts$,  { initialValue: [] as InstagramPost[] });
  readonly events      = toSignal(this.events$, { initialValue: [] as CumbiaEvent[] });
  readonly weeklySongs = toSignal(this.songs$,  { initialValue: [] as WeeklySong[] });

  // ── IMGBB: Subir imágenes (gratuito, sin tarjeta) ─────────────
  async uploadImages(files: File[]): Promise<string[]> {
    const apiKey = environment.imgbb.apiKey;
    const urls: string[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('key', apiKey);
        formData.append('image', file); // Subir el archivo binario directamente

        const response = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP error ${response.status}: ${errText}`);
        }

        const result = await response.json();

        if (result && result.success && result.data && result.data.url) {
          urls.push(result.data.url);
        } else {
          throw new Error(result?.error?.message || 'Error en respuesta de ImgBB');
        }
      } catch (err: any) {
        console.error('Error al subir imagen a ImgBB:', err);
        throw err;
      }
    }

    return urls;
  }

  // ── POSTS CRUD ───────────────────────────────────────────────
  async addPost(post: Omit<InstagramPost, 'id' | 'createdAt'>) {
    await addDoc(this.postsCol, { ...post, createdAt: serverTimestamp() });
  }

  async updatePost(id: string, postUpdates: Partial<InstagramPost>) {
    const docRef = doc(db, 'posts', id);
    await updateDoc(docRef, { ...postUpdates });
  }

  async deletePost(id: string) {
    const docRef = doc(db, 'posts', id);
    await deleteDoc(docRef);
  }

  // ── EVENTS CRUD ──────────────────────────────────────────────
  async addEvent(event: Omit<CumbiaEvent, 'id' | 'createdAt'>) {
    await addDoc(this.eventsCol, { ...event, createdAt: serverTimestamp() });
  }

  async updateEvent(id: string, eventUpdates: Partial<CumbiaEvent>) {
    const docRef = doc(db, 'events', id);
    await updateDoc(docRef, { ...eventUpdates });
  }

  async deleteEvent(id: string) {
    const docRef = doc(db, 'events', id);
    await deleteDoc(docRef);
  }

  // ── SONGS CRUD ───────────────────────────────────────────────
  async addSong(song: Omit<WeeklySong, 'id' | 'createdAt'>) {
    await addDoc(this.songsCol, { ...song, createdAt: serverTimestamp() });
  }

  async updateSong(id: string, songUpdates: Partial<WeeklySong>) {
    const docRef = doc(db, 'songs', id);
    await updateDoc(docRef, { ...songUpdates });
  }

  async deleteSong(id: string) {
    const docRef = doc(db, 'songs', id);
    await deleteDoc(docRef);
  }
}
