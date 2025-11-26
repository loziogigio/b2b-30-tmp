"use client";

import { Fragment, createElement, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { CustomHTMLBlockConfig } from '@/lib/types/blocks';

interface CustomHTMLBlockProps {
  config: CustomHTMLBlockConfig;
}

const BOOLEAN_ATTRIBUTES = new Set([
  'allowfullscreen',
  'allowFullScreen',
  'autoplay',
  'checked',
  'controls',
  'disabled',
  'hidden',
  'loop',
  'multiple',
  'muted',
  'playsinline',
  'readonly',
  'required',
  'selected'
]);

const ATTRIBUTE_RENAMES: Record<string, string> = {
  allowfullscreen: 'allowFullScreen'
};

const toCamelCase = (value: string) =>
  value.replace(/-([a-z0-9])/gi, (_, char: string) => char.toUpperCase());

const styleStringToObject = (styleString: string): CSSProperties => {
  const style: CSSProperties = {};
  styleString
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const [property, rawValue] = declaration.split(':');
      if (!property || rawValue === undefined) return;
      const name = toCamelCase(property.trim());
      style[name as keyof CSSProperties] = rawValue.trim();
    });
  return style;
};

const convertNodeToReact = (node: ChildNode, key: string): ReactNode => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'script') {
      return null;
    }

    const props: Record<string, unknown> = {};

    Array.from(element.attributes).forEach((attr) => {
      let name = ATTRIBUTE_RENAMES[attr.name] ?? attr.name;
      const value = attr.value;

      if (name.includes('-') && !name.startsWith('data-') && !name.startsWith('aria-')) {
        name = toCamelCase(name);
      }

      if (name === 'class') {
        name = 'className';
      } else if (name === 'for') {
        name = 'htmlFor';
      }

      if (name === 'style') {
        props.style = styleStringToObject(value);
        return;
      }

      if (BOOLEAN_ATTRIBUTES.has(name)) {
        if (!value || value.toLowerCase() === name.toLowerCase()) {
          props[name] = true;
          return;
        }
        props[name] = value;
        return;
      }

      props[name] = value;
    });

    const children = Array.from(element.childNodes)
      .map((child, index) => convertNodeToReact(child, `${key}-${index}`))
      .filter((child): child is ReactNode => child !== null);

    return createElement(
      element.tagName.toLowerCase(),
      { ...props, key },
      children.length > 0 ? children : undefined
    );
  }

  return null;
};

const parseHtmlToNodes = (html: string): ReactNode[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const template = document.createElement('template');
  template.innerHTML = html;

  return Array.from(template.content.childNodes)
    .map((node, index) => convertNodeToReact(node, `custom-html-${index}`))
    .filter((child): child is ReactNode => child !== null);
};

export function CustomHTMLBlock({ config }: CustomHTMLBlockProps) {
  const { html, containerClass } = config;
  const [nodes, setNodes] = useState<ReactNode[]>([]);

  useEffect(() => {
    setNodes(parseHtmlToNodes(html));
  }, [html]);

  if (!nodes.length) {
    return null;
  }

  if (containerClass && containerClass.trim().length > 0) {
    return <div className={containerClass}>{nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>)}</div>;
  }

  return (
    <>
      {nodes.map((node, index) => (
        <Fragment key={index}>{node}</Fragment>
      ))}
    </>
  );
}
