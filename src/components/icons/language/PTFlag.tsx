export const PTFlag: React.FC<React.SVGAttributes<{}>> = ({ ...rest }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 480"
      className="h-full"
      {...rest}
    >
      {/* Field: green hoist (2/5) + red fly (3/5) */}
      <path fill="#f00" d="M256 0h384v480H256z" />
      <path fill="#060" d="M0 0h256v480H0z" />
      {/* Armillary sphere (simplified) centred on the green/red boundary */}
      <g
        transform="translate(256 240)"
        fill="none"
        stroke="#ff0"
        strokeWidth="9"
      >
        <circle r="74" />
        <ellipse rx="74" ry="30" />
        <ellipse rx="30" ry="74" />
        <path d="M-74 0h148" />
      </g>
      {/* Shield */}
      <path
        fill="#fff"
        stroke="#f00"
        strokeWidth="9"
        d="M222 188h68v82c0 24-20 40-34 48-14-8-34-24-34-48z"
      />
      <path fill="#039" d="M242 210h28v44c0 12-9 20-14 24-5-4-14-12-14-24z" />
    </svg>
  );
};
