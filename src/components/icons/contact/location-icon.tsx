const LocationIcon: React.FC<React.SVGAttributes<{}>> = ({ ...rest }) => {
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path
        d="M30 3C18.954 3 10 11.954 10 23C10 38.75 30 57 30 57C30 57 50 38.75 50 23C50 11.954 41.046 3 30 3ZM15 23C15 14.716 21.716 8 30 8C38.284 8 45 14.716 45 23C45 31.5 36.5 43 30 50.5C23.5 43 15 31.5 15 23Z"
        fill="#8C969F"
      />
      <circle
        cx="30"
        cy="23"
        r="7"
        stroke="#8C969F"
        strokeWidth="4"
        fill="none"
      />
    </svg>
  );
};

export default LocationIcon;
