import * as React from 'react';

// Utility to get react state from localStorage if exists
// https://www.robinwieruch.de/local-storage-react/
const useLocalStorage = (storageKey, fallbackState) => {
  const [value, setValue] = React.useState(
    JSON.parse(localStorage.getItem(storageKey) as string) ?? fallbackState
  );

  React.useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }, [value, storageKey]);

  return [value, setValue];
};

export {
  useLocalStorage
}