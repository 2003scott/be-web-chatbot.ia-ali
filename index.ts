
import { env } from "./src/config";
import app from "./src/app";

const isVercel = !!process.env.VERCEL;

if (!isVercel) {
    app.listen(env.PORT, () => {
        console.log(`Server is running on port ${env.PORT}`);
    });
}

export default app;