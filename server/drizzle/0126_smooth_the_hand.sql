CREATE INDEX "order_planner_orders_status_created_at_idx" ON "order_planner_orders" USING btree ("status","created_at");
