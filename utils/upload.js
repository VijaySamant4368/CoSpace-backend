import multer from "multer";
export const upload = multer({ dest: "temp/" }); // saves to /temp first