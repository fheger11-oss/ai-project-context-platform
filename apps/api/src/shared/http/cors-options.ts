type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

export function createCorsOptions(origins: true | string[]) {
  return {
    origin:
      origins === true
        ? true
        : (origin: string | undefined, callback: CorsOriginCallback) => {
            callback(null, origin === undefined || origins.includes(origin));
          },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 600
  };
}
