import * as React from 'react';

// Utility to get react state from localStorage if exists
// https://www.robinwieruch.de/local-storage-react/
// TODO: Check if var in localStorage has same type and values
// https://stackoverflow.com/questions/14368596/how-can-i-check-that-two-objects-have-the-same-set-of-property-names
const useLocalStorage = (storageKey, fallbackState) => {
  const [value, setValue] = React.useState(
    JSON.parse(localStorage.getItem(storageKey) as string) ?? fallbackState
  );

  React.useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }, [value, storageKey]);

  return [value, setValue];
};


/* GSD */
const GSD_steps = [ 0, 0.15, 0.30, 0.50, 1, 2, 5, 15, 30];
function GSDFromIndex(gsd_index: number) {
  const GSD_meters = GSD_steps[gsd_index];
  return (GSD_meters < 1)? `${Math.floor(GSD_meters*100)}cm` : `${GSD_meters}m`;
}

export {
  useLocalStorage, 
  GSD_steps, 
  GSDFromIndex
}