/** Parse string/number to number, handles comma as decimal separator (e.g. "13141,42" or "13141.42") */

const currencyRupiah = (value: number) =>
  `Rp ${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const extractCurrencyToNumber = (value: string): number => Number(value.replace(/[^0-9]/g, ''));

const currentcyThousand = (value: number) =>
  `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

// misal belakang ,00 maka hilangkan, jika ada makan 1,90292
const currencyThousandWithDecimal = (value: number, decimalPlaces?: number) => {
  // Jika decimalPlaces tidak ditentukan, gunakan toString() default
  let valueString: string;

  if (decimalPlaces !== undefined) {
    valueString = value.toFixed(decimalPlaces);
  } else {
    valueString = value.toString();
  }

  const [integerPart, decimalPart] = valueString.split('.');

  // Format bagian integer dengan pemisah ribuan
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Jika tidak ada desimal, langsung return integer
  if (!decimalPart) {
    return formattedInteger;
  }

  // Hilangkan trailing zero dari desimal
  const trimmedDecimal = decimalPart.replace(/0+$/, '');

  // Jika setelah di-trim tidak ada desimal, return integer saja
  if (!trimmedDecimal) {
    return formattedInteger;
  }

  return `${formattedInteger},${trimmedDecimal}`;
};
export { currencyRupiah, extractCurrencyToNumber, currentcyThousand, currencyThousandWithDecimal };
