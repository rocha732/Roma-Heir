import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { UsersService } from 'src/app/core/services/users.service';
import { timer, Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationModalComponent } from 'src/app/components/notification-modal/notification-modal.component';

@Component({
  selector: 'app-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss'],
})
export class CreateUserComponent {
  userForm: FormGroup;
  codeForm: FormGroup;

  countries = [
    {
      id: 1,
      name: 'Argentina',
      code: 'AR',
    },
    {
      id: 2,
      name: 'Bolivia',
      code: 'BO',
    },
    {
      id: 3,
      name: 'Brazil',
      code: 'BR',
    },
    {
      id: 4,
      name: 'Chile',
      code: 'CL',
    },
    {
      id: 5,
      name: 'Colombia',
      code: 'CO',
    },
    {
      id: 6,
      name: 'Ecuador',
      code: 'EC',
    },
    {
      id: 7,
      name: 'Guyana',
      code: 'GY',
    },
    {
      id: 8,
      name: 'Paraguay',
      code: 'PY',
    },
    {
      id: 9,
      name: 'Peru',
      code: 'PE',
    },
    {
      id: 442,
      name: 'Kuwait',
      code: 'KW',
    },
    {
      id: 443,
      name: 'Kyrgyz Republic',
      code: 'KG',
    },
    {
      id: 444,
      name: "Lao People's Democratic Republic",
      code: 'LA',
    },
    {
      id: 445,
      name: 'Latvia',
      code: 'LV',
    },
    {
      id: 446,
      name: 'Lebanon',
      code: 'LB',
    },
    {
      id: 447,
      name: 'Lesotho',
      code: 'LS',
    },
    {
      id: 448,
      name: 'Liberia',
      code: 'LR',
    },
    {
      id: 449,
      name: 'Libya',
      code: 'LY',
    },
    {
      id: 450,
      name: 'Liechtenstein',
      code: 'LI',
    },
    {
      id: 451,
      name: 'Lithuania',
      code: 'LT',
    },
    {
      id: 452,
      name: 'Luxembourg',
      code: 'LU',
    },
    {
      id: 453,
      name: 'Macao',
      code: 'MO',
    },
    {
      id: 454,
      name: 'Madagascar',
      code: 'MG',
    },
    {
      id: 455,
      name: 'Malawi',
      code: 'MW',
    },
    {
      id: 456,
      name: 'Malaysia',
      code: 'MY',
    },
    {
      id: 457,
      name: 'Maldives',
      code: 'MV',
    },
    {
      id: 458,
      name: 'Mali',
      code: 'ML',
    },
    {
      id: 459,
      name: 'Malta',
      code: 'MT',
    },
    {
      id: 460,
      name: 'Marshall Islands',
      code: 'MH',
    },
    {
      id: 461,
      name: 'Martinique',
      code: 'MQ',
    },
    {
      id: 462,
      name: 'Mauritania',
      code: 'MR',
    },
    {
      id: 463,
      name: 'Mauritius',
      code: 'MU',
    },
    {
      id: 464,
      name: 'Mayotte',
      code: 'YT',
    },
    {
      id: 465,
      name: 'Mexico',
      code: 'MX',
    },
    {
      id: 466,
      name: 'Micronesia',
      code: 'FM',
    },
    {
      id: 467,
      name: 'Moldova',
      code: 'MD',
    },
    {
      id: 468,
      name: 'Monaco',
      code: 'MC',
    },
    {
      id: 469,
      name: 'Mongolia',
      code: 'MN',
    },
    {
      id: 470,
      name: 'Montenegro',
      code: 'ME',
    },
    {
      id: 471,
      name: 'Montserrat',
      code: 'MS',
    },
    {
      id: 472,
      name: 'Morocco',
      code: 'MA',
    },
    {
      id: 473,
      name: 'Mozambique',
      code: 'MZ',
    },
    {
      id: 474,
      name: 'Myanmar',
      code: 'MM',
    },
    {
      id: 475,
      name: 'Namibia',
      code: 'NA',
    },
    {
      id: 476,
      name: 'Nauru',
      code: 'NR',
    },
    {
      id: 477,
      name: 'Nepal',
      code: 'NP',
    },
    {
      id: 478,
      name: 'Netherlands',
      code: 'NL',
    },
    {
      id: 479,
      name: 'New Caledonia',
      code: 'NC',
    },
    {
      id: 480,
      name: 'New Zealand',
      code: 'NZ',
    },
    {
      id: 481,
      name: 'Nicaragua',
      code: 'NI',
    },
    {
      id: 482,
      name: 'Niger',
      code: 'NE',
    },
    {
      id: 483,
      name: 'Nigeria',
      code: 'NG',
    },
    {
      id: 484,
      name: 'Niue',
      code: 'NU',
    },
    {
      id: 485,
      name: 'Norfolk Island',
      code: 'NF',
    },
    {
      id: 486,
      name: 'North Macedonia',
      code: 'MK',
    },
    {
      id: 487,
      name: 'Northern Mariana Islands',
      code: 'MP',
    },
    {
      id: 488,
      name: 'Norway',
      code: 'NO',
    },
    {
      id: 489,
      name: 'Oman',
      code: 'OM',
    },
    {
      id: 490,
      name: 'Pakistan',
      code: 'PK',
    },
    {
      id: 491,
      name: 'Palau',
      code: 'PW',
    },
    {
      id: 492,
      name: 'Palestine',
      code: 'PS',
    },
    {
      id: 493,
      name: 'Panama',
      code: 'PA',
    },
    {
      id: 494,
      name: 'Papua New Guinea',
      code: 'PG',
    },
    {
      id: 495,
      name: 'Philippines',
      code: 'PH',
    },
    {
      id: 496,
      name: 'Pitcairn Islands',
      code: 'PN',
    },
    {
      id: 497,
      name: 'Poland',
      code: 'PL',
    },
    {
      id: 498,
      name: 'Portugal',
      code: 'PT',
    },
    {
      id: 499,
      name: 'Puerto Rico',
      code: 'PR',
    },
    {
      id: 500,
      name: 'Qatar',
      code: 'QA',
    },
    {
      id: 501,
      name: 'Réunion',
      code: 'RE',
    },
    {
      id: 502,
      name: 'Romania',
      code: 'RO',
    },
    {
      id: 503,
      name: 'Russian Federation',
      code: 'RU',
    },
    {
      id: 504,
      name: 'Rwanda',
      code: 'RW',
    },
    {
      id: 505,
      name: 'Saint Barthélemy',
      code: 'BL',
    },
    {
      id: 506,
      name: 'Saint Helena, Ascension and Tristan da Cunha',
      code: 'SH',
    },
    {
      id: 507,
      name: 'Saint Kitts and Nevis',
      code: 'KN',
    },
    {
      id: 508,
      name: 'Saint Lucia',
      code: 'LC',
    },
    {
      id: 509,
      name: 'Saint Martin',
      code: 'MF',
    },
    {
      id: 510,
      name: 'Saint Pierre and Miquelon',
      code: 'PM',
    },
    {
      id: 511,
      name: 'Saint Vincent and the Grenadines',
      code: 'VC',
    },
    {
      id: 512,
      name: 'Samoa',
      code: 'WS',
    },
    {
      id: 513,
      name: 'San Marino',
      code: 'SM',
    },
    {
      id: 514,
      name: 'Sao Tome and Principe',
      code: 'ST',
    },
    {
      id: 515,
      name: 'Saudi Arabia',
      code: 'SA',
    },
    {
      id: 516,
      name: 'Senegal',
      code: 'SN',
    },
    {
      id: 517,
      name: 'Serbia',
      code: 'RS',
    },
    {
      id: 518,
      name: 'Seychelles',
      code: 'SC',
    },
    {
      id: 519,
      name: 'Sierra Leone',
      code: 'SL',
    },
    {
      id: 520,
      name: 'Singapore',
      code: 'SG',
    },
    {
      id: 521,
      name: 'Sint Maarten (Dutch part)',
      code: 'SX',
    },
    {
      id: 522,
      name: 'Slovakia (Slovak Republic)',
      code: 'SK',
    },
    {
      id: 523,
      name: 'Slovenia',
      code: 'SI',
    },
    {
      id: 524,
      name: 'Solomon Islands',
      code: 'SB',
    },
    {
      id: 525,
      name: 'Somalia',
      code: 'SO',
    },
    {
      id: 526,
      name: 'South Africa',
      code: 'ZA',
    },
    {
      id: 527,
      name: 'South Georgia and the South Sandwich Islands',
      code: 'GS',
    },
    {
      id: 528,
      name: 'South Sudan',
      code: 'SS',
    },
    {
      id: 529,
      name: 'Spain',
      code: 'ES',
    },
    {
      id: 530,
      name: 'Sri Lanka',
      code: 'LK',
    },
    {
      id: 531,
      name: 'Sudan',
      code: 'SD',
    },
    {
      id: 532,
      name: 'Suriname',
      code: 'SR',
    },
    {
      id: 533,
      name: 'Svalbard & Jan Mayen Islands',
      code: 'SJ',
    },
    {
      id: 534,
      name: 'Eswatini',
      code: 'SZ',
    },
    {
      id: 535,
      name: 'Sweden',
      code: 'SE',
    },
    {
      id: 536,
      name: 'Switzerland',
      code: 'CH',
    },
    {
      id: 537,
      name: 'Syrian Arab Republic',
      code: 'SY',
    },
    {
      id: 538,
      name: 'Taiwan',
      code: 'TW',
    },
    {
      id: 539,
      name: 'Tajikistan',
      code: 'TJ',
    },
    {
      id: 540,
      name: 'Tanzania',
      code: 'TZ',
    },
    {
      id: 541,
      name: 'Thailand',
      code: 'TH',
    },
    {
      id: 542,
      name: 'Timor-Leste',
      code: 'TL',
    },
    {
      id: 543,
      name: 'Togo',
      code: 'TG',
    },
    {
      id: 544,
      name: 'Tokelau',
      code: 'TK',
    },
    {
      id: 545,
      name: 'Tonga',
      code: 'TO',
    },
    {
      id: 546,
      name: 'Trinidad and Tobago',
      code: 'TT',
    },
    {
      id: 547,
      name: 'Tunisia',
      code: 'TN',
    },
    {
      id: 548,
      name: 'Türkiye',
      code: 'TR',
    },
    {
      id: 549,
      name: 'Turkmenistan',
      code: 'TM',
    },
    {
      id: 550,
      name: 'Turks and Caicos Islands',
      code: 'TC',
    },
    {
      id: 551,
      name: 'Tuvalu',
      code: 'TV',
    },
    {
      id: 552,
      name: 'Uganda',
      code: 'UG',
    },
    {
      id: 553,
      name: 'Ukraine',
      code: 'UA',
    },
    {
      id: 554,
      name: 'United Arab Emirates',
      code: 'AE',
    },
    {
      id: 555,
      name: 'United Kingdom of Great Britain and Northern Ireland',
      code: 'GB',
    },
    {
      id: 556,
      name: 'United States of America',
      code: 'US',
    },
    {
      id: 557,
      name: 'United States Minor Outlying Islands',
      code: 'UM',
    },
    {
      id: 558,
      name: 'United States Virgin Islands',
      code: 'VI',
    },
    {
      id: 559,
      name: 'Uruguay',
      code: 'UY',
    },
    {
      id: 560,
      name: 'Uzbekistan',
      code: 'UZ',
    },
    {
      id: 561,
      name: 'Vanuatu',
      code: 'VU',
    },
    {
      id: 562,
      name: 'Venezuela',
      code: 'VE',
    },
    {
      id: 563,
      name: 'Vietnam',
      code: 'VN',
    },
    {
      id: 564,
      name: 'Wallis and Futuna',
      code: 'WF',
    },
    {
      id: 565,
      name: 'Western Sahara',
      code: 'EH',
    },
    {
      id: 566,
      name: 'Yemen',
      code: 'YE',
    },
    {
      id: 567,
      name: 'Zambia',
      code: 'ZM',
    },
    {
      id: 568,
      name: 'Zimbabwe',
      code: 'ZW',
    },
    {
      id: 569,
      name: 'Afghanistan',
      code: 'AF',
    },
    {
      id: 570,
      name: 'Åland Islands',
      code: 'AX',
    },
    {
      id: 571,
      name: 'Albania',
      code: 'AL',
    },
    {
      id: 572,
      name: 'Algeria',
      code: 'DZ',
    },
    {
      id: 573,
      name: 'American Samoa',
      code: 'AS',
    },
    {
      id: 574,
      name: 'Andorra',
      code: 'AD',
    },
    {
      id: 575,
      name: 'Angola',
      code: 'AO',
    },
    {
      id: 576,
      name: 'Anguilla',
      code: 'AI',
    },
    {
      id: 577,
      name: 'Antarctica',
      code: 'AQ',
    },
    {
      id: 578,
      name: 'Antigua and Barbuda',
      code: 'AG',
    },
    {
      id: 579,
      name: 'Armenia',
      code: 'AM',
    },
    {
      id: 580,
      name: 'Aruba',
      code: 'AW',
    },
    {
      id: 581,
      name: 'Australia',
      code: 'AU',
    },
    {
      id: 582,
      name: 'Austria',
      code: 'AT',
    },
    {
      id: 583,
      name: 'Azerbaijan',
      code: 'AZ',
    },
    {
      id: 584,
      name: 'Bahamas',
      code: 'BS',
    },
    {
      id: 585,
      name: 'Bahrain',
      code: 'BH',
    },
    {
      id: 586,
      name: 'Bangladesh',
      code: 'BD',
    },
    {
      id: 587,
      name: 'Barbados',
      code: 'BB',
    },
    {
      id: 588,
      name: 'Belarus',
      code: 'BY',
    },
    {
      id: 589,
      name: 'Belgium',
      code: 'BE',
    },
    {
      id: 590,
      name: 'Belize',
      code: 'BZ',
    },
    {
      id: 591,
      name: 'Benin',
      code: 'BJ',
    },
    {
      id: 592,
      name: 'Bermuda',
      code: 'BM',
    },
    {
      id: 593,
      name: 'Bhutan',
      code: 'BT',
    },
    {
      id: 594,
      name: 'Bonaire, Sint Eustatius and Saba',
      code: 'BQ',
    },
    {
      id: 595,
      name: 'Bosnia and Herzegovina',
      code: 'BA',
    },
    {
      id: 596,
      name: 'Botswana',
      code: 'BW',
    },
    {
      id: 597,
      name: 'Bouvet Island (Bouvetøya)',
      code: 'BV',
    },
    {
      id: 598,
      name: 'British Indian Ocean Territory (Chagos Archipelago)',
      code: 'IO',
    },
    {
      id: 599,
      name: 'British Virgin Islands',
      code: 'VG',
    },
    {
      id: 600,
      name: 'Brunei Darussalam',
      code: 'BN',
    },
    {
      id: 601,
      name: 'Bulgaria',
      code: 'BG',
    },
    {
      id: 602,
      name: 'Burkina Faso',
      code: 'BF',
    },
    {
      id: 603,
      name: 'Burundi',
      code: 'BI',
    },
    {
      id: 604,
      name: 'Cambodia',
      code: 'KH',
    },
    {
      id: 605,
      name: 'Cameroon',
      code: 'CM',
    },
    {
      id: 606,
      name: 'Canada',
      code: 'CA',
    },
    {
      id: 607,
      name: 'Cabo Verde',
      code: 'CV',
    },
    {
      id: 608,
      name: 'Cayman Islands',
      code: 'KY',
    },
    {
      id: 609,
      name: 'Central African Republic',
      code: 'CF',
    },
    {
      id: 610,
      name: 'Chad',
      code: 'TD',
    },
    {
      id: 611,
      name: 'China',
      code: 'CN',
    },
    {
      id: 612,
      name: 'Christmas Island',
      code: 'CX',
    },
    {
      id: 613,
      name: 'Cocos (Keeling) Islands',
      code: 'CC',
    },
    {
      id: 614,
      name: 'Comoros',
      code: 'KM',
    },
    {
      id: 615,
      name: 'Congo',
      code: 'CD',
    },
    {
      id: 616,
      name: 'Cook Islands',
      code: 'CK',
    },
    {
      id: 617,
      name: 'Costa Rica',
      code: 'CR',
    },
    {
      id: 618,
      name: "Cote d'Ivoire",
      code: 'CI',
    },
    {
      id: 619,
      name: 'Croatia',
      code: 'HR',
    },
    {
      id: 620,
      name: 'Cuba',
      code: 'CU',
    },
    {
      id: 621,
      name: 'Curaçao',
      code: 'CW',
    },
    {
      id: 622,
      name: 'Cyprus',
      code: 'CY',
    },
    {
      id: 623,
      name: 'Czechia',
      code: 'CZ',
    },
    {
      id: 624,
      name: 'Denmark',
      code: 'DK',
    },
    {
      id: 625,
      name: 'Djibouti',
      code: 'DJ',
    },
    {
      id: 626,
      name: 'Dominica',
      code: 'DM',
    },
    {
      id: 627,
      name: 'Dominican Republic',
      code: 'DO',
    },
    {
      id: 628,
      name: 'Egypt',
      code: 'EG',
    },
    {
      id: 629,
      name: 'El Salvador',
      code: 'SV',
    },
    {
      id: 630,
      name: 'Equatorial Guinea',
      code: 'GQ',
    },
    {
      id: 631,
      name: 'Eritrea',
      code: 'ER',
    },
    {
      id: 632,
      name: 'Estonia',
      code: 'EE',
    },
    {
      id: 633,
      name: 'Ethiopia',
      code: 'ET',
    },
    {
      id: 634,
      name: 'Faroe Islands',
      code: 'FO',
    },
    {
      id: 635,
      name: 'Falkland Islands (Malvinas)',
      code: 'FK',
    },
    {
      id: 636,
      name: 'Fiji',
      code: 'FJ',
    },
    {
      id: 637,
      name: 'Finland',
      code: 'FI',
    },
    {
      id: 638,
      name: 'France',
      code: 'FR',
    },
    {
      id: 639,
      name: 'French Guiana',
      code: 'GF',
    },
    {
      id: 640,
      name: 'French Polynesia',
      code: 'PF',
    },
    {
      id: 641,
      name: 'French Southern Territories',
      code: 'TF',
    },
    {
      id: 642,
      name: 'Gabon',
      code: 'GA',
    },
    {
      id: 643,
      name: 'Gambia',
      code: 'GM',
    },
    {
      id: 644,
      name: 'Georgia',
      code: 'GE',
    },
    {
      id: 645,
      name: 'Germany',
      code: 'DE',
    },
    {
      id: 646,
      name: 'Ghana',
      code: 'GH',
    },
    {
      id: 647,
      name: 'Gibraltar',
      code: 'GI',
    },
    {
      id: 648,
      name: 'Greece',
      code: 'GR',
    },
    {
      id: 649,
      name: 'Greenland',
      code: 'GL',
    },
    {
      id: 650,
      name: 'Grenada',
      code: 'GD',
    },
    {
      id: 651,
      name: 'Guadeloupe',
      code: 'GP',
    },
    {
      id: 652,
      name: 'Guam',
      code: 'GU',
    },
    {
      id: 653,
      name: 'Guatemala',
      code: 'GT',
    },
    {
      id: 654,
      name: 'Guernsey',
      code: 'GG',
    },
    {
      id: 655,
      name: 'Guinea',
      code: 'GN',
    },
    {
      id: 656,
      name: 'Guinea-Bissau',
      code: 'GW',
    },
    {
      id: 657,
      name: 'Haiti',
      code: 'HT',
    },
    {
      id: 658,
      name: 'Heard Island and McDonald Islands',
      code: 'HM',
    },
    {
      id: 659,
      name: 'Holy See (Vatican City State)',
      code: 'VA',
    },
    {
      id: 660,
      name: 'Honduras',
      code: 'HN',
    },
    {
      id: 661,
      name: 'Hong Kong',
      code: 'HK',
    },
    {
      id: 662,
      name: 'Hungary',
      code: 'HU',
    },
    {
      id: 663,
      name: 'Iceland',
      code: 'IS',
    },
    {
      id: 664,
      name: 'India',
      code: 'IN',
    },
    {
      id: 665,
      name: 'Indonesia',
      code: 'ID',
    },
    {
      id: 666,
      name: 'Iran',
      code: 'IR',
    },
    {
      id: 667,
      name: 'Iraq',
      code: 'IQ',
    },
    {
      id: 668,
      name: 'Ireland',
      code: 'IRL',
    },
    {
      id: 669,
      name: 'Isle of Man',
      code: 'IMN',
    },
    {
      id: 670,
      name: 'Israel',
      code: 'IL',
    },
    {
      id: 671,
      name: 'Italy',
      code: 'IT',
    },
    {
      id: 672,
      name: 'Jamaica',
      code: 'JM',
    },
    {
      id: 673,
      name: 'Japan',
      code: 'JP',
    },
    {
      id: 674,
      name: 'Jersey',
      code: 'JE',
    },
    {
      id: 675,
      name: 'Jordan',
      code: 'JO',
    },
    {
      id: 676,
      name: 'Kazakhstan',
      code: 'KZ',
    },
    {
      id: 677,
      name: 'Kenya',
      code: 'KE',
    },
    {
      id: 678,
      name: 'Kiribati',
      code: 'KI',
    },
    {
      id: 679,
      name: 'Korea',
      code: 'KR',
    },
  ];
  isLoading = false;

  roles = [
    { id: 1, name: 'customer' },
    { id: 2, name: 'specialist' },
    { id: 3, name: 'admin' },
  ];

  submitted = false;
  timerSeconds = 30;
  timerSubscription!: Subscription;

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private modalService: NgbModal
  ) {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{9,15}$/)]],
      countryId: ['', Validators.required],
      roleId: ['', Validators.required],
    });

    this.codeForm = this.fb.group({
      verificationCode: [
        '',
        [Validators.required, Validators.minLength(4), Validators.maxLength(6)],
      ],
    });
  }

  get firstName(): FormControl {
    return this.userForm.get('firstName') as FormControl;
  }

  get lastName(): FormControl {
    return this.userForm.get('lastName') as FormControl;
  }

  get email(): FormControl {
    return this.userForm.get('email') as FormControl;
  }

  get phone(): FormControl {
    return this.userForm.get('phone') as FormControl;
  }

  get countryId(): FormControl {
    return this.userForm.get('countryId') as FormControl;
  }

  get roleId(): FormControl {
    return this.userForm.get('roleId') as FormControl;
  }

  get verificationCode(): FormControl {
    return this.codeForm.get('verificationCode') as FormControl;
  }

  submit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.usersService.postRegisterUser(this.userForm.value).subscribe({
      next: () => {
        this.submitted = true;
        this.startTimer();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.openErrorModal(err, 'No se pudo registrar el usuario. Intente nuevamente.');
      },
    });
  }

  startTimer() {
    this.timerSeconds = 30;
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = timer(0, 1000).subscribe((sec) => {
      this.timerSeconds = 30 - sec;
      if (this.timerSeconds <= 0) {
        this.timerSubscription.unsubscribe();
      }
    });
  }

  resendCode() {
    this.isLoading = true;
    this.usersService.postResendCode(this.userForm.value).subscribe({
      next: () => {
        this.startTimer();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.openErrorModal(err, 'No se pudo reenviar el código. Intente nuevamente.');
      },
    });
  }

  verifyCode() {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.usersService
      .postVerifyAccount({
        email: this.userForm.value.email,
        code: this.verificationCode?.value,
      })
      .subscribe({
        next: (data) => {
          this.isLoading = false;
          const modalRef = this.modalService.open(NotificationModalComponent, {
            centered: true,
          });

          if (data.isVerified) {
            modalRef.componentInstance.title = '¡Éxito!';
            modalRef.componentInstance.message =
              'Usuario creado y verificado con éxito.';
            modalRef.componentInstance.type = 'success';

            // Resetear formularios y cerrar card
            this.resetForms();
          } else {
            modalRef.componentInstance.title = 'Error';
            modalRef.componentInstance.message =
              'Código de verificación incorrecto. Por favor, intente nuevamente.';
            modalRef.componentInstance.type = 'error';
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.openErrorModal(err, 'No se pudo verificar el código. Intente nuevamente.');
        },
      });
  }

  private openErrorModal(err: any, defaultMsg: string) {
    const message = err?.error?.detail || err?.error?.message || err?.error?.title || defaultMsg;
    const modalRef = this.modalService.open(NotificationModalComponent, { centered: true });
    modalRef.componentInstance.title = 'Error';
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.type = 'error';
  }

  private resetForms() {
    // Resetear ambos formularios
    this.userForm.reset();
    this.codeForm.reset();

    // Cerrar el card de verificación
    this.submitted = false;

    // Detener timer si está corriendo
    this.timerSubscription?.unsubscribe();
    this.timerSeconds = 30;
  }
}
