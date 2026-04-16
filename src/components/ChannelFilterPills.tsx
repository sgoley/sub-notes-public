import { useEffect, useState, useRef } from "react";
import { pb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ChannelFilterPillsProps {
  selectedChannel: string | null;
  onSelectChannel: (channel: string | null) => void;
}

export const ChannelFilterPills = ({ selectedChannel, onSelectChannel }: ChannelFilterPillsProps) => {
  const [channels, setChannels] = useState<string[]>([]);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      const records = await pb.collection("content_summaries").getFullList({
        fields: "author",
        filter: 'author != ""',
      });
      const uniqueChannels = [...new Set(records.map((r) => r.author).filter(Boolean))] as string[];
      setChannels(uniqueChannels);
    };
    fetchChannels().catch(console.error);
  }, []);

  const updateArrows = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setShowLeftArrow(container.scrollLeft > 0);
    setShowRightArrow(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    updateArrows();
    container.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);
    return () => {
      container.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [channels]);

  const scroll = (direction: "left" | "right") => {
    scrollContainerRef.current?.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative mb-4 group w-full">
      {showLeftArrow && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </>
      )}
      {showRightArrow && (
        <>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth w-full"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <Button
          variant={!selectedChannel ? "default" : "outline"}
          onClick={() => onSelectChannel(null)}
          className="shrink-0"
        >
          All
        </Button>
        {channels.map((channel) => (
          <Button
            key={channel}
            variant={selectedChannel === channel ? "default" : "outline"}
            onClick={() => onSelectChannel(channel)}
            className="shrink-0"
          >
            {channel}
          </Button>
        ))}
      </div>
    </div>
  );
};
