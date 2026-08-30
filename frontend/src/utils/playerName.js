export function firstName(name) {
  if (!name) return name;
  return name.split(' ')[0];
}
