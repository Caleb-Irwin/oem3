import type { ComponentType } from 'svelte';
import Tags from 'lucide-svelte/icons/tags';
import ReceiptText from 'lucide-svelte/icons/receipt-text';
import Boxes from 'lucide-svelte/icons/boxes';
import Building2 from 'lucide-svelte/icons/building-2';
import Truck from 'lucide-svelte/icons/truck';
import Calculator from 'lucide-svelte/icons/calculator';
import ShoppingBag from 'lucide-svelte/icons/shopping-bag';
import ShieldCheck from 'lucide-svelte/icons/shield-check';

/** A destination shown both in the nav bar menus and as a home page tile. */
export interface NavItem {
	href: string;
	title: string;
	icon: ComponentType;
	/** Key into the home page's stat map, when the page has a summary to show. */
	stat?: 'unifiedProduct' | 'unifiedGuild' | 'unifiedSpr' | 'qb' | 'shopify';
}

export const workflows: NavItem[] = [
	{
		href: '/app/shelf',
		title: 'Shelf Labels',
		icon: Tags
	},
	{
		href: '/app/price',
		title: 'Price List',
		icon: ReceiptText
	},
	{
		href: '/app/product',
		title: 'Unified Products',
		icon: Boxes,
		stat: 'unifiedProduct'
	}
];

export const dataSources: NavItem[] = [
	{
		href: '/app/guild',
		title: 'Guild',
		icon: Building2,
		stat: 'unifiedGuild'
	},
	{
		href: '/app/spr',
		title: 'SPRichards',
		icon: Truck,
		stat: 'unifiedSpr'
	},
	{
		href: '/app/qb',
		title: 'QuickBooks',
		icon: Calculator,
		stat: 'qb'
	},
	{
		href: '/app/shopify',
		title: 'Shopify',
		icon: ShoppingBag,
		stat: 'shopify'
	}
];

export const adminItems: NavItem[] = [
	{
		href: '/app/admin',
		title: 'Admin Panel',
		icon: ShieldCheck
	}
];
