import Link from 'next/link';
import { useState } from 'react';

interface SubMenuItem {
  label: string;
  href: string;
}

interface SubMenuProps {
  items: SubMenuItem[];
  position: { top: number; left: number };
  visible: boolean;
}

const SubMenu = ({ items, position, visible }: SubMenuProps) => {
  if (!visible) return null;

  return (
    <div 
      className="absolute bg-white shadow-lg rounded-md py-2 z-[1000]"
      style={{ 
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      {items.map((item, index) => (
        <Link
          key={index}
          href={item.href}
          className="block px-4 py-2 text-sm text-gray-500 hover:bg-lamaSkyLight"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
};

export default SubMenu;
