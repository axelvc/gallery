import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, type ListRenderItem, useWindowDimensions } from "react-native";
import { DraxProvider, SortableContainer } from "react-native-drax";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { EmptyGalleryState } from "@/features/home/components/empty-gallery-state";
import { GalleryGridItem } from "@/features/home/components/gallery-grid-item";
import { HomeListHeader } from "@/features/home/components/home-list-header";
import { GRID_COLUMNS, GRID_GAP } from "@/features/home/constants";
import { useHomeScreen } from "@/features/home/hooks/use-home-screen";
import { createHomeScreenStyles } from "@/features/home/styles";
import type { GalleryPhoto } from "@/features/home/types";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function HomeScreen() {
	const listRef = useRef<FlatList<GalleryPhoto>>(null);
	const colorScheme = useColorScheme() ?? "light";
	const { width } = useWindowDimensions();
	const theme = Colors[colorScheme];
	const { t } = useTranslation();
	const styles = useMemo(() => createHomeScreenStyles(theme), [theme]);
	const {
		avatarUrl,
		bio,
		displayName,
		followers,
		following,
		highlights,
		isLoadingProfile,
		isPicking,
		postsCount,
		profileLoaded,
		profileName,
		profileSource,
		removePhoto,
		refreshAddedPhotos,
		sortable,
		loadProfile,
		pickPhotos,
	} = useHomeScreen();

	const gridSize = useMemo(() => {
		const horizontalPadding = 0;
		return Math.floor((width - horizontalPadding) / GRID_COLUMNS - GRID_GAP);
	}, [width]);
	const removePhotoLabel = t("home.removePhoto");
	const renderGalleryItem = useCallback<ListRenderItem<GalleryPhoto>>(
		({ item, index }) => (
			<GalleryGridItem
				gridSize={gridSize}
				index={index}
				item={item}
				onRemovePhoto={removePhoto}
				removePhotoLabel={removePhotoLabel}
				sortable={sortable}
				styles={styles}
			/>
		),
		[gridSize, removePhoto, removePhotoLabel, sortable, styles],
	);

	return (
		<SafeAreaView edges={["top"]} style={styles.safeArea}>
			<ThemedView style={styles.screen}>
				<DraxProvider>
					<SortableContainer
						sortable={sortable}
						scrollRef={listRef}
						style={styles.scrollContent}
					>
						<FlatList<GalleryPhoto>
							ref={listRef}
							data={sortable.data}
							extraData={sortable.data}
							numColumns={GRID_COLUMNS}
							keyExtractor={sortable.stableKeyExtractor}
							removeClippedSubviews={false}
							initialNumToRender={24}
							windowSize={10}
							maxToRenderPerBatch={24}
							updateCellsBatchingPeriod={50}
							onScroll={sortable.onScroll}
							onContentSizeChange={sortable.onContentSizeChange}
							contentContainerStyle={styles.listContainer}
							ListHeaderComponent={
								<HomeListHeader
									avatarUrl={avatarUrl}
									bio={bio}
									displayName={displayName}
									followers={followers}
									following={following}
									highlights={highlights}
									isLoadingProfile={isLoadingProfile}
									isPicking={isPicking}
									loadProfile={loadProfile}
									pickPhotos={pickPhotos}
									postsCount={postsCount}
									profileLoaded={profileLoaded}
									profileName={profileName}
									profileSource={profileSource}
									refreshAddedPhotos={refreshAddedPhotos}
									styles={styles}
									theme={theme}
								/>
							}
							ListEmptyComponent={() => (
								<EmptyGalleryState
									onPickPhotos={pickPhotos}
									styles={styles}
									theme={theme}
								/>
							)}
							renderItem={renderGalleryItem}
						/>
					</SortableContainer>
				</DraxProvider>
			</ThemedView>
		</SafeAreaView>
	);
}
