import cn from 'classnames';
interface Props {
  className?: string;
  children?: any;
  el?: HTMLElement;
  clean?: boolean;
  fullWidth?: boolean;
}

const Container: React.FC<Props> = ({
  children,
  className,
  el = 'div',
  clean,
  fullWidth,
}) => {
  // Aligned to Deghi-style 20px horizontal padding, slightly wider cap (1600px).
  const rootClassName = cn(className, {
    'mx-auto max-w-[1600px] px-5': !clean && !fullWidth,
  });

  let Component: React.ComponentType<React.HTMLAttributes<HTMLDivElement>> =
    el as any;

  return <Component className={rootClassName}>{children}</Component>;
};

export default Container;
