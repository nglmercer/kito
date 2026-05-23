import { check } from 'k6';
import ws from 'k6/ws';

export const options = {
  vus: 10,
  duration: '10s',
};

export default function () {
  const url = __ENV.WS_URL || 'ws://localhost:3000/ws';
  const params = { tags: { my_tag: 'hello' } };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      socket.send('ping');
    });
    socket.on('message', (data) => {
      socket.send(data);
    });
    socket.on('close', () => console.log('disconnected'));
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
