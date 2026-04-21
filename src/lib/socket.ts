import { io } from 'socket.io-client';

const socket = io(window.location.origin, {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('Connected to tracking server');
});

socket.on('connect_error', (error) => {
  console.warn('Tracking connection error:', error.message);
});

export default socket;
