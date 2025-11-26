import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedLabel = value && options.includes(value) ? value : placeholder;

  return (
    <div className={`custom-select ${className} ${isOpen ? 'open' : ''}`} ref={selectRef}>
      <div
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={!value ? 'placeholder' : ''}>{selectedLabel}</span>
        <svg
          className="custom-select-arrow"
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1l5 5 5-5"
            stroke="#b8a2c8"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {isOpen && (
        <div className="custom-select-options">
          {options.map((option) => (
            <div
              key={option}
              className={`custom-select-option ${value && value === option ? 'selected' : ''}`}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;

