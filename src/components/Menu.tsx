import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Home",
        href: "/",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/teacher.png",
        label: "Teachers",
        href: "/list/teachers",
        visible: ["admin"],
      },
      {
        icon: "/student.png",
        label: "Students",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/attendance.png",
        label: "Sub Category",
        href: "/list/subCategory",
        visible: ["admin"],
      },
      {
        icon: "/subject.png",
        label: "Subjects",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/list/classes",
        visible: ["admin"],
      },
      {
        icon: "/lesson.png",
        label: "Sections",
        href: "/list/sections",
        visible: ["admin"],
      },
      {
        icon: "/assignment.png",
        label: "Sessions",
        href: "/list/sessions",
        visible: ["admin"],
      },
      {
        icon: "/message.png",
        label: "Promote Students",
        href: "/list/promoteStudent",
        visible: ["admin"],
      },
      {
        icon: "/exam.png",
        label: "Up to 8th",
        href: "",
        visible: ["admin", "teacher"],
        visibilityCheck: (role: string, assignedClass?: number) => 
          role === "admin" || (role === "teacher" && assignedClass && assignedClass <= 8),
        subItems: [
          { label: "Marks", href: "/list/juniorMark" },
          { label: "Co-Scholastic", href: "/list/juniorCoScholastic" },
          { label: "Results", href: "/list/results" }
        ]
      },
      {
        icon: "/exam.png",
        label: "9 Class",
        href: "",
        visible: ["admin", "teacher"],
        visibilityCheck: (role: string, assignedClass?: number) => 
          role === "admin" || (role === "teacher" && assignedClass === 9),
        subItems: [
          { label: "Marks", href: "/list/seniorMark" },
          { label: "Co-Scholastic", href: "/list/seniorCoScholastic" },
          { label: "Results", href: "/list/results9" }
        ]
      },
      {
        icon: "/exam.png",
        label: "11 Class",
        href: "",
        visible: ["admin", "teacher"],
        visibilityCheck: (role: string, assignedClass?: number) => 
          role === "admin" || (role === "teacher" && assignedClass === 11),
        subItems: [
          { label: "Marks", href: "/list/higherMark" },
          { label: "Co-Scholastic", href: "/list/higherCoScholastic" },
          { label: "Results", href: "/list/results11" }
        ]
      },
      {
        icon: "/assignment.png",
        label: "Import  & Export",
        href: "",
        visible: ["admin"],
        subItems: [
          { label: "Students", href: "/list/studentImportExport" },
          { label: "Others", href: "/list/importandexportAll" }
        ]
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/profile",
        visible: ["admin", "teacher"],
      },
    ],
  },
];

// Add type definitions
type UserRole = "admin" | "teacher" | undefined;

const Menu = async () => {
  const user = await currentUser();
  const role = (user?.publicMetadata?.role as UserRole) || undefined;
  
  // Handle special class names (Nursery, KG, UKG) and numeric classes
  const assignedClassStr = (user?.publicMetadata?.assignedClass as string) || "";
  const assignedClass = assignedClassStr.match(/^(Nursery|KG|UKG)$/) 
    ? assignedClassStr 
    : parseInt(assignedClassStr.replace("Class ", "")) || undefined;
  
  // Modified visibility check function for menu items
  const checkVisibility = (role: string, assignedClass?: string | number) => {
    if (role === "admin") return true;
    if (role !== "teacher" || !assignedClass) return false;
    
    // For numeric classes
    if (typeof assignedClass === "number") {
      return assignedClass <= 8;
    }
    
    // For special classes
    return ["Nursery", "KG", "UKG"].includes(assignedClass as string);
  };

  // Update the visibilityCheck in menuItems where needed
  const updatedMenuItems = menuItems.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      visibilityCheck: item.label === "Up to 8th" 
        ? checkVisibility
        : item.visibilityCheck
    }))
  }));


  if (!role) {
    return null;
  }

  return (
    <div className="mt-4 text-sm">
      {updatedMenuItems.map((i) => (
        <div className="flex flex-col gap-2 relative" key={i.title}>
          <span className="hidden lg:block text-gray-400 font-light my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            const isVisible = item.visible.includes(role) && 
              (!item.visibilityCheck || item.visibilityCheck(role, typeof assignedClass === 'number' ? assignedClass : undefined));

            if (isVisible) {
              return (
                <div
                  key={item.label}
                  className="relative group"
                >
                  <Link
                    href={item.href}
                    className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
                  >
                    <Image src={item.icon} alt="" width={20} height={20} />
                    <span className="hidden lg:block">{item.label}</span>
                  </Link>
                  {item.subItems && (
                    <div className="hidden group-hover:block absolute left-full top-0 z-[1000]">
                      <div className="bg-white shadow-lg rounded-md px-6 py-4">
                        {item.subItems.map((subItem, idx) => (
                          <Link
                            key={idx}
                            href={subItem.href}
                            className="block px-4 py-2 text-sm text-gray-500 hover:bg-lamaSkyLight"
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
