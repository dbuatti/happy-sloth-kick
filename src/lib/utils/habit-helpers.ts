export const getUnitDisplay = (value: number | null, unit: string | null) => {
  if (value === null || unit === null || unit === '') return '';
  
  let formattedUnit = unit;
  if (value > 1 && !unit.endsWith('s') && unit !== 'reps' && unit !== 'times') {
    formattedUnit += 's';
  }

  switch (unit.toLowerCase()) {
    case 'minutes': return `${value} min`;
    case 'kilometers': return `${value} km`;
    case 'miles': return `${value} mi`;
    case 'liters': return `${value} L`;
    case 'milliliters': return `${value} ml`;
    case 'glasses': return `${value} glasses`;
    case 'reps': return `${value} reps`;
    case 'pages': return `${value} pages`;
    case 'times': return `${value} times`;
    default: return `${value} ${formattedUnit}`;
  }
};