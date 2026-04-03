
import app from "./src/app";
import { env } from "./src/config";

app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`)
})