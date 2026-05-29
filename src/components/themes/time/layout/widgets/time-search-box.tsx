import React from 'react';
import SearchIcon from '@components/icons/search-icon';
import CloseIcon from '@components/icons/close-icon';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import { useRouter } from 'next/navigation';
import {
  pushSearch,
  type SearchProps,
} from '@components/common/search-box-b2b';

// DFL La Mura search box: a flat white field with a 1.5px ink border, a muted
// leading lens, and a solid-red square submit button on the right. Drop-in
// replacement for SearchBoxB2B (same props) — injected into SearchB2B by the
// time theme so the shared search/overlay logic is reused unchanged.
const TimeSearchBox = React.forwardRef<HTMLInputElement, SearchProps>(
  (
    {
      lang,
      className,
      searchId = 'search',
      value,
      onClear,
      onFocus,
      onSubmitSuccess,
      // `variant` is part of the shared contract but the time box has a single look.
      variant: _variant,
      ...rest
    },
    ref,
  ) => {
    const { t } = useTranslation(lang, 'forms');
    const router = useRouter();
    const handleSubmit = (e: React.SyntheticEvent) => {
      e.preventDefault();
      if (pushSearch(router, lang, value)) onSubmitSuccess?.();
    };
    return (
      <form
        className={cn(
          'relative flex w-full items-center gap-2.5 h-12 rounded-[10px] bg-white border-[1.5px] border-[var(--time-dark)] pl-3.5 pr-1.5',
          className,
        )}
        noValidate
        role="search"
        onSubmit={handleSubmit}
      >
        <SearchIcon className="w-[18px] h-[18px] shrink-0 text-[var(--time-gray-500)]" />
        <input
          id={searchId}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-semibold text-[var(--time-dark)] placeholder:font-normal placeholder:text-[var(--time-gray-400)]"
          placeholder={t('placeholder-search') as string}
          aria-label={searchId}
          autoComplete="off"
          value={value}
          onFocus={onFocus}
          ref={ref}
          {...rest}
        />

        {value && (
          <button
            type="button"
            onClick={onClear}
            title="Clear search"
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-[var(--time-gray-400)] hover:text-[var(--time-dark)]"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          title="Search"
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-[7px] bg-[var(--time-red)] text-white transition-colors hover:bg-[var(--time-dark)]"
        >
          <SearchIcon className="w-[18px] h-[18px]" />
        </button>
      </form>
    );
  },
);

TimeSearchBox.displayName = 'TimeSearchBox';
export default TimeSearchBox;
