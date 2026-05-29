import { Router } from "express";
import { getContainer } from "../services/container.js";
import { asyncHandler, HttpError } from "../middleware/error-handler.js";

const router = Router();

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const { memory } = getContainer();
    res.json({ conversations: memory.listConversations(limit) });
  }),
);

router.get(
  "/conversations/:id",
  asyncHandler(async (req, res) => {
    const { memory } = getContainer();
    const id = routeParam(req.params.id);
    const conversation = memory.getConversation(id);
    if (!conversation) {
      throw new HttpError(404, "Conversation not found", "NOT_FOUND");
    }
    const messages = memory.getMessages(id);
    res.json({ conversation, messages });
  }),
);

router.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const { memory } = getContainer();
    res.json({ tasks: memory.listTasks(limit) });
  }),
);

router.get(
  "/kv",
  asyncHandler(async (req, res) => {
    const category = req.query.category as string | undefined;
    const limit = Number(req.query.limit ?? 100);
    const { memory } = getContainer();
    res.json({ entries: memory.listMemory(category, limit) });
  }),
);

router.post(
  "/kv",
  asyncHandler(async (req, res) => {
    const { key, value, category } = req.body as {
      key?: string;
      value?: string;
      category?: string;
    };

    if (!key || value === undefined) {
      throw new HttpError(400, "key and value are required", "VALIDATION_ERROR");
    }

    const { memory } = getContainer();
    const entry = memory.setMemory(key, String(value), category ?? "general");
    res.status(201).json({ entry });
  }),
);

router.delete(
  "/kv/:key",
  asyncHandler(async (req, res) => {
    const { memory } = getContainer();
    const deleted = memory.deleteMemory(routeParam(req.params.key));
    if (!deleted) {
      throw new HttpError(404, "Key not found", "NOT_FOUND");
    }
    res.status(204).send();
  }),
);

export default router;
