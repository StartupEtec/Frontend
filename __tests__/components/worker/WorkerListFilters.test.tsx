import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { WorkerListFilters } from "../../../src/components/worker/WorkerListFilters";
import { WorkerSortOption } from "../../../src/types/worker";

const makeProps = (overrides: Record<string, unknown> = {}) => ({
  nameInput: "",
  onNameChange: jest.fn(),
  minRating: 0,
  onMinRatingChange: jest.fn(),
  sortBy: "distance" as WorkerSortOption,
  onSortChange: jest.fn(),
  accentColor: "#0f62fe",
  filteredCount: 5,
  totalCount: 5,
  onClearFilters: jest.fn(),
  hasActiveFilters: false,
  ...overrides,
});

describe("WorkerListFilters", () => {
  it("renders the search input, rating pills and sort buttons", () => {
    const { getByTestId } = render(<WorkerListFilters {...makeProps()} />);

    expect(getByTestId("worker-list-search-input")).toBeTruthy();
    expect(getByTestId("filter-rating-0")).toBeTruthy();
    expect(getByTestId("filter-rating-4")).toBeTruthy();
    expect(getByTestId("sort-distance")).toBeTruthy();
    expect(getByTestId("sort-rating")).toBeTruthy();
  });

  it("forwards name changes", () => {
    const onNameChange = jest.fn();
    const { getByTestId } = render(
      <WorkerListFilters {...makeProps({ onNameChange })} />,
    );

    fireEvent.changeText(getByTestId("worker-list-search-input"), "ana");

    expect(onNameChange).toHaveBeenCalledWith("ana");
  });

  it("clears the search text with the X button", () => {
    const onNameChange = jest.fn();
    const { getByTestId } = render(
      <WorkerListFilters {...makeProps({ nameInput: "ana", onNameChange })} />,
    );

    fireEvent.press(getByTestId("btn-worker-list-search-clear"));

    expect(onNameChange).toHaveBeenCalledWith("");
  });

  it("forwards rating and sort changes", () => {
    const onMinRatingChange = jest.fn();
    const onSortChange = jest.fn();
    const { getByTestId } = render(
      <WorkerListFilters {...makeProps({ onMinRatingChange, onSortChange })} />,
    );

    fireEvent.press(getByTestId("filter-rating-4"));
    fireEvent.press(getByTestId("sort-rating"));

    expect(onMinRatingChange).toHaveBeenCalledWith(4);
    expect(onSortChange).toHaveBeenCalledWith("rating");
  });

  it("shows the filtered/total counter", () => {
    const { getByText } = render(
      <WorkerListFilters {...makeProps({ filteredCount: 2, totalCount: 7 })} />,
    );

    expect(getByText("2 de 7 trabajadores")).toBeTruthy();
  });

  it("only shows the clear button with active filters", () => {
    const { queryByTestId, rerender } = render(
      <WorkerListFilters {...makeProps({ hasActiveFilters: false })} />,
    );
    expect(queryByTestId("btn-worker-list-clear-filters")).toBeNull();

    rerender(<WorkerListFilters {...makeProps({ hasActiveFilters: true })} />);
    expect(queryByTestId("btn-worker-list-clear-filters")).toBeTruthy();
  });

  it("calls onClearFilters from the clear button", () => {
    const onClearFilters = jest.fn();
    const { getByTestId } = render(
      <WorkerListFilters
        {...makeProps({ hasActiveFilters: true, onClearFilters })}
      />,
    );

    fireEvent.press(getByTestId("btn-worker-list-clear-filters"));

    expect(onClearFilters).toHaveBeenCalled();
  });
});
