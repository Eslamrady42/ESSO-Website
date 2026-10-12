<?php
declare(strict_types=1);

/*
 * Editable budgetary prices for the client-facing smart-home BOQ.
 * Prices are in EGP and represent equipment only, not installation.
 * ESSO catalog prices reference js/data.js; off-catalog prices are indicative
 * local-market reference models and should be confirmed before a binding quote.
 */
return [
    'zigbee 4-gang lighting switch' => [
        'unit_price' => 2140,
        'reference' => 'ESSO catalog SKU ZS-B-US4',
        'note_ar' => 'سعر كتالوج ESSO — المنتج ZS-B-US4؛ لا يشمل التركيب.',
        'note_en' => 'ESSO shop catalog — SKU ZS-B-US4; installation excluded.',
    ],
    'smart curtain motor + controller' => [
        'unit_price' => 8570,
        'reference' => 'ESSO catalog: Curtain motor + ZRS-USC controller',
        'note_ar' => 'يشمل موتور الستارة ومفتاح التحكم فقط؛ مسار الستارة والقماش والتركيب غير مشمولة.',
        'note_en' => 'Includes curtain motor and control switch only; track, fabric and installation are excluded.',
    ],
    'smart curtain channel' => [
        'unit_price' => 8570,
        'reference' => 'ESSO catalog: Curtain motor + ZRS-USC controller',
        'note_ar' => 'سعر استرشادي للموتور ومفتاح التحكم؛ مسار الستارة والقماش والتركيب غير مشمولة.',
        'note_en' => 'Budgetary price for motor and control switch; track, fabric and installation are excluded.',
    ],
    'ir hvac/remote control' => [
        'unit_price' => 1720,
        'reference' => 'ESSO catalog SKU UFO-R11',
        'note_ar' => 'وحدة تحكم IR استرشادية؛ يجب تأكيد توافقها مع جهاز التكييف.',
        'note_en' => 'Indicative IR controller; compatibility with the air conditioner must be confirmed.',
    ],
    'smoke detector' => [
        'unit_price' => 2820,
        'reference' => 'ESSO catalog SKU ZSS-HM-SSD01-A',
        'note_ar' => 'سعر كتالوج ESSO — حساس دخان Zigbee؛ التركيب غير مشمول.',
        'note_en' => 'ESSO shop catalog — Zigbee smoke detector; installation excluded.',
    ],
    'motion / presence sensor' => [
        'unit_price' => 1430,
        'reference' => 'ESSO catalog SKU ZSS-S01-PIR',
        'note_ar' => 'سعر كتالوج ESSO — حساس حركة Zigbee؛ التركيب غير مشمول.',
        'note_en' => 'ESSO shop catalog — Zigbee motion sensor; installation excluded.',
    ],
    'motion sensor for bathroom lighting control' => [
        'unit_price' => 1430,
        'reference' => 'ESSO catalog SKU ZSS-S01-PIR',
        'note_ar' => 'سعر كتالوج ESSO — حساس حركة للتحكم في إنارة الحمام؛ التركيب غير مشمول.',
        'note_en' => 'ESSO shop catalog — motion sensor for bathroom lighting control; installation excluded.',
    ],
    'temperature sensor' => [
        'unit_price' => 1220,
        'reference' => 'ESSO catalog SKU ZSS-S01-TH',
        'note_ar' => 'سعر كتالوج ESSO — حساس حرارة ورطوبة Zigbee؛ التركيب غير مشمول.',
        'note_en' => 'ESSO shop catalog — Zigbee temperature/humidity sensor; installation excluded.',
    ],
    'water leak sensor' => [
        'unit_price' => 1400,
        'reference' => 'ESSO catalog SKU ZSS-QY-WL-C',
        'note_ar' => 'سعر كتالوج ESSO — حساس تسرب مياه Zigbee؛ التركيب غير مشمول.',
        'note_en' => 'ESSO shop catalog — Zigbee water-leak sensor; installation excluded.',
    ],
    'gas detector' => [
        'unit_price' => 2420,
        'reference' => 'ESSO catalog SKU ZSS-QY-GL',
        'note_ar' => 'سعر كتالوج ESSO — كاشف غاز Zigbee؛ التركيب غير مشمول.',
        'note_en' => 'ESSO shop catalog — Zigbee gas detector; installation excluded.',
    ],
    'motorized gas valve' => [
        'unit_price' => 3400,
        'reference' => 'ESSO catalog SKU ZV-QY-WH',
        'note_ar' => 'سعر كتالوج ESSO — محبس غاز آلي؛ يلزم تأكيد توافق المحبس مع خط الغاز.',
        'note_en' => 'ESSO shop catalog — motorized gas shutoff valve; gas-line compatibility must be confirmed.',
    ],
    'cctv point' => [
        'unit_price' => 1199,
        'reference' => 'Indicative reference: TP-Link Tapo C210 indoor 2K camera',
        'note_ar' => 'سعر استرشادي لكاميرا Wi-Fi داخلية 2K؛ لا يشمل NVR أو التخزين أو الكابلات أو التركيب، وقد يختلف سعر كاميرات CCTV السلكية.',
        'note_en' => 'Indicative price for an indoor 2K Wi-Fi camera; NVR, storage, cabling and installation are excluded. Wired CCTV cameras may cost more.',
    ],
    'smart lock - main entrance' => [
        'unit_price' => 8000,
        'reference' => 'Indicative reference: Lzen D01 connected smart lock',
        'note_ar' => 'سعر استرشادي لقفل ذكي متصل؛ الموديل النهائي والتوافق مع الباب والتركيب يؤثرون على السعر.',
        'note_en' => 'Indicative price for a connected smart lock; final model, door compatibility and installation affect the price.',
    ],
    'motorized main water valve' => [
        'unit_price' => 3400,
        'reference' => 'ESSO catalog SKU ZV-QY-WH',
        'note_ar' => 'سعر كتالوج ESSO — محبس إغلاق آلي لخط المياه؛ التركيب وتعديلات السباكة غير مشمولة.',
        'note_en' => 'ESSO shop catalog — motorized main water shutoff valve; plumbing work and installation excluded.',
    ],
    'voice assistant integration' => [
        'unit_price' => 3470,
        'reference' => 'ESSO catalog product Echo Pop',
        'note_ar' => 'سعر جهاز Echo Pop من كتالوج ESSO؛ إعداد التكامل والبرمجة غير مشمولين.',
        'note_en' => 'ESSO catalog price for Echo Pop device; integration setup and programming are excluded.',
    ],
    'smart-home network access point' => [
        'unit_price' => 4550,
        'reference' => 'Indicative reference: TP-Link Omada EAP225 access point',
        'note_ar' => 'سعر استرشادي لنقطة وصول Wi-Fi؛ الكابلات والسويتش وملحقات PoE والتركيب غير مشمولة.',
        'note_en' => 'Indicative price for a Wi-Fi access point; cabling, switch, PoE accessories and installation are excluded.',
    ],
];
