import Web3 from 'web3';

export const formatFloat = (n, precision = 3) => {
  const i = Math.trunc(n);
  const f = n - i;

  const fStr = f.toFixed(precision).replace(/0+$/, '').replace(/^0./, '');

  if (fStr.length === 0) {
    return i.toString(10);
  }

  return `${i.toString(10)}.${fStr}`;
};

export const parseIntOrDefault = (str, defaultValue) => {
  const parsed = parseInt(str, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

export const parseTokenDecimal = (value, decimal) => {
  let finalValue;
  const _value = Math.round(value * 100);
  const _decimal = decimal - 2;
  switch (decimal) {
    case 1:
      finalValue = Math.round(value * 10);
      break;
    case 2:
      finalValue = Math.round(value * 100);
      break;
    case 3:
      finalValue = Math.round(value * 1000);
      break;
    default:
      finalValue = Web3.utils
        .toBN(_value)
        .mul(Web3.utils.toBN('10').pow(Web3.utils.toBN(_decimal)))
        .toString();
      break;
  }
  return finalValue;
};

export const parseTokenValue = (value, decimal) => {
  let finalValue;

  switch (decimal) {
    default:
      finalValue = Web3.utils
        .toBN(value)
        .div(Web3.utils.toBN('10').pow(Web3.utils.toBN(decimal)))
        .toString();
      break;
  }
  return finalValue;
};

export const daysToSeconds = (days) => days * 24 * 60 * 60;

export const roundToNearest100 = (value) => Math.ceil(value / 100) * 100;

export const weiToEth = (value) => Web3.utils.fromWei(value, 'ether');

export const formatDecimal = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
