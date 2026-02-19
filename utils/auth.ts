
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

const USERS_KEY = 'gp_users_db';
const SESSION_KEY = 'gp_session';

async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const authService = {
  async register(name: string, email: string, password: string): Promise<User> {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    if (users.find(u => u.email === email)) {
      throw new Error('Este e-mail já está em uso.');
    }

    const newUser: User = {
      id: uuidv4(),
      name,
      email,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Auto login after register
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return newUser;
  },

  async login(email: string, password: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const hashedPassword = await hashPassword(password);
    
    const user = users.find(u => u.email === email && u.passwordHash === hashedPassword);
    
    if (!user) {
      throw new Error('E-mail ou senha inválidos.');
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  async updateProfile(userId: string, data: { name: string; email: string; phone?: string; password?: string }): Promise<User> {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) throw new Error('Usuário não encontrado.');

    // Verificar se o novo e-mail já existe em outro usuário
    if (users.find((u, idx) => u.email === data.email && idx !== userIndex)) {
      throw new Error('Este e-mail já está sendo usado por outro usuário.');
    }

    const updatedUser = { ...users[userIndex] };
    updatedUser.name = data.name;
    updatedUser.email = data.email;
    updatedUser.phone = data.phone;

    if (data.password) {
      updatedUser.passwordHash = await hashPassword(data.password);
    }

    users[userIndex] = updatedUser;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    
    return updatedUser;
  },

  getCurrentUser(): User | null {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  }
};
