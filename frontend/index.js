// @ts-nocheck

let eventSource;

const handleConnection = (id) => {
  eventSource = new EventSource(`http://localhost:5001/notification/${id}`);
  eventSource.addEventListener('notification', (event) => {
    const data = JSON.parse(event.data);
    const notificationDiv = document.getElementById('notifications');
    const messageElement = document.createElement('li');
    messageElement.innerHTML = `<strong>${data.title}:</strong> ${data.message} at ${data.timestamp}`;
    notificationDiv.appendChild(messageElement);
  });
};

// eventSource.onmessage = (event) => {
//   console.log(event);
//   timeElement.innerText = event.data;
// };

const loginUser = () => {
  const userId = Math.round(Math.random() * 1000);
  sessionStorage.setItem('userId', userId);
  handleConnection(userId);
};

const logout = async () => {
  try {
    const res = await fetch('http://localhost:5001/logout', {
      method: 'POST',
      body: JSON.stringify({
        userId: sessionStorage.getItem('userId'),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    await res.json();
    eventSource?.close?.();
    sessionStorage.removeItem('userId');
  } catch (error) {}
};

const loginLogoutElement = document.getElementById('loginLogout');
const loginLogout = () => {
  if (loginLogoutElement.innerHTML === 'LOGIN') {
    loginUser();
    loginLogoutElement.innerHTML = 'LOGOUT';
  } else {
    logout();
    loginLogoutElement.innerHTML = 'LOGIN';
  }
};
