import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cohortsRouter from "./cohorts";
import supervisorsRouter from "./supervisors";
import associatesRouter from "./associates";
import checkinsRouter from "./checkins";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cohortsRouter);
router.use(supervisorsRouter);
router.use(associatesRouter);
router.use(checkinsRouter);
router.use(dashboardRouter);

export default router;
