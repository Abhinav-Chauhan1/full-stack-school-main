export const ITEM_PER_PAGE = 10

type RouteAccessMap = {
  [key: string]: string[];
};

export const routeAccessMap: RouteAccessMap = {
  "/admin(.*)": ["admin"],
  "/list/teachers": ["admin","teacher"],
  "/list/students": ["admin"],
  "/list/subjects": ["admin"],
  "/list/classes": ["admin"],
  "/list/exams": ["admin"],
  "/list/assignments": ["admin"],
  "/list/results": ["admin"],
  "/list/attendance": ["admin"],
  "/list/events": ["admin"],
  "/list/announcements": ["admin"],
};