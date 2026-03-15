export function identity(value) {
  return value;
}

export function uid() {
  return crypto.randomUUID();
}

export function randomUserId() {
  return `FG-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100000 + Math.random() * 900000)}`;
}
