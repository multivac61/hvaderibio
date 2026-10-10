// One definition of the poster sizes, so a preload hint asks for the same
// file the <img> picks and the poster is not downloaded twice.
export const poster_srcset = (id: number) => `/${id}-360w.webp 360w, /${id}.webp 720w, /${id}-1080w.webp 1080w`;

export const POSTER_SIZES = "(max-width: 640px) calc(50vw - 2rem), (max-width: 1024px) calc(33vw - 2rem), 360px";
