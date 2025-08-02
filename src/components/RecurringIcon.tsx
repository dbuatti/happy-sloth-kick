import React from 'react';

const RecurringIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M17 12a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5 5 5 0 0 0 5 5h5a5 5 0 0 0 5-5z" />
    <path d="M12 7v10" />
    <path d="M15 10l-3-3-3 3" />
  </svg>
);

export default RecurringIcon;