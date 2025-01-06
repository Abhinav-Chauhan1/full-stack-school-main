export const ITEM_PER_PAGE = 10

type RouteAccessMap = {
  [key: string]: string[];
};

export const routeAccessMap: RouteAccessMap = {
  "/admin(.*)": ["admin"],
  "/list/teachers": ["admin","teacher"],
  "/list/students": ["admin","teacher"],
  "/list/subjects": ["admin","teacher"],
  "/list/classes": ["admin","teacher"],
  "/list/imports": ["admin"],
  "/list/assignments": ["admin"],
  "/list/juniorMark": ["admin","teacher"],
  "/list/results": ["admin"],
  "/list/sections": ["admin","teacher"],
  "/list/sessions": ["admin"],
  "/list/announcements": ["admin"],
};