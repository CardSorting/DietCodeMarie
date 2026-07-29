import { FocusChainAuthority, FocusChainAuthorityDependencies } from "./FocusChainAuthority"

export { FocusChainAuthority, type FocusChainAuthorityDependencies } from "./FocusChainAuthority"

export interface FocusChainDependencies extends FocusChainAuthorityDependencies {}

export class FocusChainManager extends FocusChainAuthority {}
