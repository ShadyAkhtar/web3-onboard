const get = () => localStorage.getItem('selectedWallet');
const set = (value) => localStorage.setItem('selectedWallet', value);
const clear = () => localStorage.removeItem('selectedWallet');

export default { get, set, clear };
