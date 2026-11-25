// Açık Parkur sekmesi (Seyhun 2026-10-30 "parkurdaki asistan öncelikli olarak parkurla çalışmalı"): asistan sekmenin gösterdiği
// yarışa ve GÜNE yazar (bugün değilse de), göreli cümleler ve sorular için ekrandaki parkuru okur. CourseTab açıkken doludur.
let view = null; // { id, day, get: () => parkur }
export const setCourseView = (v) => void (view = v);
export const courseView = () => view;
