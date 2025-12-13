import React from 'react';
import SearchIcon from '@components/icons/search-icon';
import CloseIcon from '@components/icons/close-icon';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import { useRouter } from 'next/navigation';

type SearchProps = {
  lang: string;
  className?: string;
  searchId?: string;
  onSubmit: (e: React.SyntheticEvent) => void;
  onClear: (e: React.SyntheticEvent) => void;
  onFocus?: (e: React.SyntheticEvent) => void;
  onChange: (e: React.FormEvent<HTMLInputElement>) => void;
  onSubmitSuccess?: () => void;
  name: string;
  value: string;
  variant?: 'border' | 'fill';
};

const SearchBoxB2B = React.forwardRef<HTMLInputElement, SearchProps>(
  (
    {
      lang,
      className,
      searchId = 'search',
      variant = 'border',
      value,
      onClear,
      onFocus,
      onSubmitSuccess,
      ...rest
    },
    ref,
  ) => {
    const { t } = useTranslation(lang, 'forms');
    const router = useRouter();
    const handleSubmit = (e: React.SyntheticEvent) => {
      e.preventDefault(); // ✅ prevent normal form reload
      if (!value.trim()) return; // ✅ ignore empty search

      // ✅ Redirect to /lang/search?text=value
      router.push(`/${lang}/search?text=${encodeURIComponent(value.trim())}`);
      // ✅ Tell parent to close overlay (but NOT clear input)
      onSubmitSuccess?.();
    };
    return (
      <form
        className={cn('relative flex w-full rounded-md bg-white', className)}
        noValidate
        role="search"
        onSubmit={handleSubmit}
      >
        <input
          id={searchId}
          className={cn(
            'pl-4 pr-20 text-heading outline-none w-full h-[48px] rounded-md bg-brand-light text-brand-dark text-sm lg:text-15px transition-all duration-200 focus:border-brand focus:ring-0 placeholder:text-brand-dark/50',
            {
              'border border-brand': variant === 'border',
              'bg-fill-one': variant === 'fill',
            },
          )}
          placeholder={t('placeholder-search') as string}
          aria-label={searchId}
          autoComplete="off"
          value={value}
          onFocus={onFocus}
          ref={ref}
          {...rest}
        />

        {/* Right-side container */}
        <div className="absolute top-0 right-0 flex items-center h-full pr-2">
          {/* Show clear X only if there's value */}
          {value && (
            <>
              <button
                type="button"
                onClick={onClear}
                title="Clear search"
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <CloseIcon className="w-4 h-4" />
              </button>

              {/* Divider after X */}
              <div className="h-5 w-px bg-gray-300 mx-2" />
            </>
          )}

          {/* Always show lens (submit) */}
          <button
            type="submit"
            title="Search"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-brand hover:text-brand-dark"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    );
  },
);

export default SearchBoxB2B;

SearchBoxB2B.displayName = 'SearchBoxB2B';
