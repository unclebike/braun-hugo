type LocationInput = {
    postalCode?: string;
    lat?: number;
    lng?: number;
};
type ServiceAreaResult = {
    within: boolean;
    distance?: number;
};
export declare function checkServiceArea(areaType: string, areaData: string, location: LocationInput, _bufferKm?: number): ServiceAreaResult;
export {};
//# sourceMappingURL=service-area.d.ts.map