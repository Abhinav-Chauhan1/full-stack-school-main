export const ITEM_PER_PAGE = 10

type RouteAccessMap = {
  [key: string]: string[];
};

export const routeAccessMap: RouteAccessMap = {
  "/admin(.*)": ["admin"],
  "/teacher(.*)": ["teacher"],
  "/list/teachers": ["admin"],
  "/list/subjects": ["admin"],
  "/list/classes": ["admin"],
  "/list/sessions": ["admin"],
  "/list/promoteStudents": ["admin"],
  "/list/importandexportAll": ["admin"],
  "/list/studentImportExport": ["admin"],
  "/list/students": ["admin", "teacher"],
  "/list/juniorMark": ["admin", "teacher"],
  "/list/seniorMark": ["admin", "teacher"],
  "/list/higherMark": ["admin", "teacher"],
  "/list/results": ["admin", "teacher"],
  "/list/results9": ["admin", "teacher"],
  "/list/results11": ["admin", "teacher"],
  "/list/sections": ["admin","teacher"],
  "/list/subCategory": ["admin","teacher"],
};