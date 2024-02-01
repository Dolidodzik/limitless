import React, { useEffect } from 'react';
import '../index.css'

const AlertPopup = ({ alert, onClose }: any) => {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [onClose]);
  console.log(alert)
  return (
    <div className="popup">
      <p>{alert}</p>
    </div>
  );
};

export default AlertPopup;