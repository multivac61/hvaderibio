export const get_youtube_id = (url: string | undefined) => url?.match(/(?:v=|\/vi\/)([^&?/]+)/)?.[1];
