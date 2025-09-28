"use client";

import React, { useState } from 'react';
import { useMealStaples, NewMealStapleData, StapleSortOption } from '@/hooks/useMealStaples';
import StapleItem from './StapleItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, ListOrdered, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface StaplesInventoryProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const newStapleSchema = z.object({
  name: z.string().min(1, { message: 'Staple name is required.' }),
  target_quantity: z.coerce.number().min(0, { message: 'Target quantity cannot be negative.' }).default(0),
  unit: z.string().optional(),
});

const StaplesInventory: React.FC<StaplesInventoryProps> = ({ isDemo = false, demoUserId }) => {
  const [sortOption, setSortOption] = useState<StapleSortOption>('item_order_asc');
  const { staples, loading, addStaple, updateStaple, deleteStaple, reorderStaples } = useMealStaples({
    userId: demoUserId,
    sortOption,
  });

  const form = useForm<z.infer<typeof newStapleSchema>>({
    resolver: zodResolver(newStapleSchema),
    defaultValues: {
      name: '',
      target_quantity: 0,
      unit: '',
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (isDemo) return;
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = staples.findIndex((staple) => staple.id === active.id);
      const newIndex = staples.findIndex((staple) => staple.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = Array.from(staples);
        const [movedItem] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, movedItem);

        const orderedIds = newOrder.map(s => s.id);
        await reorderStaples(orderedIds);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof newStapleSchema>) => {
    if (isDemo) return;
    await addStaple({
      name: values.name,
      target_quantity: values.target_quantity,
      current_quantity: 0, // New staples start with 0 current quantity
      unit: values.unit || null,
    });
    form.reset();
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-muted/20">
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Add New Staple
          </h4>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staple Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Eggs, Milk, Bread" {...field} disabled={isDemo} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="target_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={isDemo} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., dozen, liter, loaf" {...field} disabled={isDemo} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isDemo || form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Staple
          </Button>
        </form>
      </Form>

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" /> Your Staples
        </h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="sort-staples" className="sr-only">Sort by</Label>
          <Select
            value={sortOption}
            onValueChange={(value: StapleSortOption) => setSortOption(value)}
            disabled={isDemo || loading}
          >
            <SelectTrigger id="sort-staples" className="w-[180px]">
              <ListOrdered className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="item_order_asc">Order</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="current_quantity_asc">Current Qty (Low to High)</SelectItem>
              <SelectItem value="current_quantity_desc">Current Qty (High to Low)</SelectItem>
              <SelectItem value="target_quantity_asc">Target Qty (Low to High)</SelectItem>
              <SelectItem value="target_quantity_desc">Target Qty (High to Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : staples.length === 0 ? (
        <p className="text-center text-muted-foreground p-8 border rounded-lg">
          No meal staples added yet. Use the form above to add your first staple!
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={staples.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {staples.map((staple) => (
                <StapleItem
                  key={staple.id}
                  staple={staple}
                  onUpdate={updateStaple}
                  onDelete={deleteStaple}
                  isDemo={isDemo}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default StaplesInventory;